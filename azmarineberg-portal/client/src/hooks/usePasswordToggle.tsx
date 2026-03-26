import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEyeSlash, faEye } from "@fortawesome/free-solid-svg-icons";

const usePasswordToggle = (): [string, JSX.Element] => {
  const [visible, setVisible] = useState(false);
  const InputType = visible ? "text" : "password";
  const Icon = (
    <FontAwesomeIcon
      size="xs"
      icon={visible ? faEye : faEyeSlash}
      onClick={() => setVisible(!visible)}
      className="text-gray-700"
    />
  );
  return [InputType, Icon];
};

export default usePasswordToggle;
