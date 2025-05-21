import fs from "fs"
import path from "path"
import https from "https"
import { Extract as unzipper } from "unzipper"
import { rimraf } from "rimraf"

const UV_VERSION = "0.5.29"
const UV_FILENAME = "uv-x86_64-pc-windows-msvc.zip"
const UV_URL = `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/${UV_FILENAME}`

type Platform = "darwin" | "win32"
type Arch = "arm64" | "x64"
type UVConfig = {
  filename: string
  extractCmd: string
}

const getUVConfig = (platform: Platform, arch: Arch): UVConfig => {
  const configs: Record<Platform, Record<Arch, UVConfig>> = {
    darwin: {
      arm64: {
        filename: "uv-aarch64-apple-darwin.tar.gz",
        extractCmd: "tar"
      },
      x64: {
        filename: "uv-x86_64-apple-darwin.tar.gz",
        extractCmd: "tar"
      }
    },
    win32: {
      x64: {
        filename: "uv-x86_64-pc-windows-msvc.zip",
        extractCmd: "unzip"
      },
      arm64: {
        filename: "uv-x86_64-pc-windows-msvc.zip", // Windows only has x64 version currently
        extractCmd: "unzip"
      }
    }
  }

  return configs[platform][arch]
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
    }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          downloadFile(redirectUrl, dest).then(resolve).catch(reject)
          return
        }
      }

      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest)
        response.pipe(file)
        file.on("finish", () => {
          console.log("UV downloaded successfully", file.path)
          file.close()
          resolve()
        })
      } else {
        reject(new Error(`HTTP Status Code: ${response.statusCode}`))
      }
    })

    request.on("error", (err) => {
      console.error("Error downloading UV:", err)
      fs.unlink(dest, () => reject(err))
    })
  })
}

async function extract(filePath: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(unzipper({ path: destPath }))
      .on("close", resolve)
      .on("error", reject)
  })
}

async function main() {
  const targetDir = path.join(process.cwd(), "bin", "uv", "win-x64")

  if (fs.existsSync(path.join(targetDir, "uv.exe"))) {
    console.log(`UV v${UV_VERSION} already exists in ./${targetDir}`)
    return
  }

  fs.mkdirSync(path.join(process.cwd(), "temp"), { recursive: true })
  fs.mkdirSync(targetDir, { recursive: true })

  const tempFile = path.join(process.cwd(), "temp", UV_FILENAME)

  try {
    console.log(`Downloading UV v${UV_VERSION}...`)
    await downloadFile(UV_URL, tempFile)

    console.log("Extracting...")
    await extract(tempFile, targetDir)

    console.log("Cleaning up...")
    rimraf("temp").catch(() => {})

    console.log(`Done! UV v${UV_VERSION} has been downloaded to ./${targetDir}`)
  } catch (error) {
    console.error("Error:", error)
    if (fs.existsSync("temp")) {
      rimraf("temp").catch(() => {})
    }
    process.exit(1)
  }
}

main()