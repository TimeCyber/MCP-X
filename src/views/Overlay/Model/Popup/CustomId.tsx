import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import PopupConfirm from "../../../../components/PopupConfirm";
import WrappedInput from "../../../../components/WrappedInput";
import { ListOption } from "../ModelsProvider";

const CustomIdPopup = ({
  listOptions,
  setListOptions,
}: {
  listOptions: ListOption[];
  setListOptions: Dispatch<SetStateAction<ListOption[]>>;
}) => {
  const { t } = useTranslation();
  const [showCustomModelID, setShowCustomModelID] = useState(false);
  const [customModelID, setCustomModelID] = useState("");
  const [customModelIDError, setCustomModelIDError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    autoFocus();
  }, [showCustomModelID]);

  const autoFocus = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    inputRef.current?.focus();
  };

  const addCustomModelID = (name: string) => {
    setCustomModelIDError("");
    if (name.length == 0) {
      // check if the model id is empty
      setCustomModelIDError(t("models.customModelIDError1"));
      return;
    } else if (listOptions.find((option) => option.name === name)) {
      // check if the model id is already in the list
      setCustomModelIDError(t("models.customModelIDError2"));
      return;
    }

    setListOptions((prev: ListOption[]) => {
      return [
        {
          name,
          checked: true,
          verifyStatus: "unVerified",
          isCustom: true,
        },
        ...prev,
      ];
    });
    setShowCustomModelID(false);
    setCustomModelID("");
    setCustomModelIDError("");
  };

  const handleCustomModelIDChange = (name: string) => {
    setCustomModelID(name);
    setCustomModelIDError("");
  };

  const handleCustomModelIDClose = () => {
    setShowCustomModelID(false);
    setCustomModelID("");
    setCustomModelIDError("");
  };
  return (
    <>
      <button
        className="model-list-add-key"
        onClick={() => setShowCustomModelID(true)}
      >
        {t("models.addCustomModelID")}
      </button>
      {showCustomModelID && (
        <PopupConfirm
          zIndex={900}
          className="model-customID-popup"
          onConfirm={() => addCustomModelID(customModelID)}
          onCancel={handleCustomModelIDClose}
          onClickOutside={handleCustomModelIDClose}
          footerType="center"
          noBorder={true}
        >
          <div className="model-popup-content">
            <div className="model-option-name-input-content">
              <div className="model-popup-title">
                {t("models.customModelIDTitle")}
              </div>
              <div className="model-option-name-input-wrapper">
                <WrappedInput
                  ref={inputRef}
                  value={customModelID}
                  onChange={(e) => handleCustomModelIDChange(e.target.value)}
                  placeholder={t("models.customModelIDPlaceholder")}
                  className="model-option-name-input"
                  autoFocus={true}
                />
                {customModelIDError && (
                  <div className="model-option-edit-error">
                    {customModelIDError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </PopupConfirm>
      )}
    </>
  );
};

export default CustomIdPopup;
