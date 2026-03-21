import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: IconDefinition;
  iconColor?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  icon,
  iconColor = "text-primary",
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl flex items-center justify-between transition-all font-lato">
      <div className="flex flex-col space-y-2">
        <p className="text-sm text-gray-500 font-semibold">{title}</p>
        <p className="text-3xl font-extrabold text-gray-900 font-poppins">
          {value}
        </p>
      </div>
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gray-50/50 ${iconColor}`}
      >
        <FontAwesomeIcon icon={icon} className="text-xl" />
      </div>
    </div>
  );
};

export default DashboardCard;
