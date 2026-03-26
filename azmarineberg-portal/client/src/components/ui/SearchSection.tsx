import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSearch } from "@fortawesome/free-solid-svg-icons";

interface SearchSectionProps {
  onSearchChange: (value: string) => void;
  searchValue: string;
  actionLabel: string;
  onActionClick: () => void;
  placeholder?: string;
}

const SearchSection: React.FC<SearchSectionProps> = ({
  onSearchChange,
  searchValue,
  actionLabel,
  onActionClick,
  placeholder = "Search...",
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-grow h-12">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <FontAwesomeIcon icon={faSearch} className="text-sm" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-full pl-11 pr-4 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-sm font-medium font-lato"
        />
      </div>
      <button
        onClick={onActionClick}
        className="h-12 px-6 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] whitespace-nowrap min-w-[160px] font-poppins"
      >
        <FontAwesomeIcon icon={faPlus} className="text-xs" />
        {actionLabel}
      </button>
    </div>
  );
};

export default SearchSection;
