import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  className = "",
}) => {
  return (
    <div className={`mb-8 ${className}`}>
      <h2 className="text-2xl font-semibold text-gray-900 font-poppins">{title}</h2>
      {description && (
        <p className="text-gray-500 mt-1 font-medium font-lato">
          {description}
        </p>
      )}
    </div>
  );
};

export default PageHeader;
