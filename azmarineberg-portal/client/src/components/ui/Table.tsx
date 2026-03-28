import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

interface TableProps {
  columns: string[];
  children: React.ReactNode;
  data?: {
    current_page: number;
    total: number;
    pages: number;
  };
  changePage?: (page: number) => void;
  mobileColumns?: string[];
  isLoading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  // New pagination props (optional, additive)
  pageIndex?: number;
  pageCount?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

const PER_PAGE = 10;
const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function Table({
  columns,
  children,
  data,
  changePage,
  // mobileColumns,
  isLoading,
  loadingMessage = "Loading data...",
  emptyMessage = "No data found",
  emptyIcon,
  pageIndex,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: TableProps) {
  const [currentPage, setCurrentPage] = useState<string | number>(
    data ? data.current_page : 1,
  );

  const startCount = data ? PER_PAGE * (data.current_page - 1) + 1 : 0;
  const endCount = data
    ? data.total < data.current_page * PER_PAGE
      ? data.total
      : data.current_page * PER_PAGE
    : 0;

  const onInputChange = (val: string) => {
    if (val === "" || /^[0-9\b]+$/.test(val)) {
      setCurrentPage(val);
    }
  };

  const onKeyChange = (key: string) => {
    if (key === "Enter" && changePage && data) {
      const pageNum = Number(currentPage);
      if (!isNaN(pageNum) && pageNum > 0) {
        if (pageNum > data.pages) {
          setCurrentPage(data.pages);
          changePage(data.pages);
        } else {
          changePage(pageNum);
        }
      }
    }
  };

  const handleBlur = () => {
    if (data) {
      if (currentPage === "") setCurrentPage(data.current_page);
      if (Number(currentPage) > data.pages) setCurrentPage(data.pages);
    }
  };

  const goToPrev = () => {
    if (changePage && data && data.current_page > 1) {
      changePage(data.current_page - 1);
    }
  };

  const goToNext = () => {
    if (changePage && data && data.current_page < data.pages) {
      changePage(data.current_page + 1);
    }
  };

  const rowCount = React.Children.count(children);

  // New pagination helpers
  const hasNewPagination =
    pageCount !== undefined && onPageChange !== undefined;
  const currentPageIndex = pageIndex ?? 0;
  const totalPages = pageCount ?? 1;
  const canGoPrev = currentPageIndex > 0;
  const canGoNext = currentPageIndex < totalPages - 1;

  return (
    <div className="w-full">
      {data?.current_page && (
        <div className="flex justify-end mb-4">
          <p className="inline-flex items-center px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-bold text-gray-500 uppercase tracking-wider font-poppins">
            Showing{" "}
            <span className="text-primary mx-1">
              {startCount} - {endCount}
            </span>{" "}
            of {data.total}
          </p>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto hide_scrollbar">
          {isLoading ? (
            <div className="p-20 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium font-lato">
                {loadingMessage}
              </p>
            </div>
          ) : rowCount === 0 ? (
            <div className="p-20 text-center">
              {emptyIcon ? (
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  {emptyIcon}
                </div>
              ) : (
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                </div>
              )}
              <p className="text-gray-500 font-bold font-poppins">
                {emptyMessage}
              </p>
              <p className="text-sm text-gray-400 mt-1 font-lato">
                Try adjusting your filters or search options
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="bg-gray-50/80 backdrop-blur-sm">
                <tr className="h-14">
                  <th className="pl-6 w-16 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 font-poppins text-center">
                    #
                  </th>
                  {columns.map((column, index) => (
                    <th
                      className="px-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 font-poppins whitespace-nowrap"
                      key={index}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-lato">
                {children}
              </tbody>
            </table>
          )}
        </div>

        {/* New unified pagination footer */}
        {hasNewPagination && !isLoading && rowCount > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4 bg-gray-50/40">
            {/* Rows per page */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium font-lato whitespace-nowrap">
                Rows per page
              </span>
              <select
                value={pageSize ?? 20}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                className="h-8 px-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white outline-none focus:border-primary transition-all"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Page info */}
            <span className="text-xs text-gray-500 font-medium font-lato">
              Page {currentPageIndex + 1} of {totalPages}
            </span>

            {/* Arrow navigation */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange(currentPageIndex - 1)}
                disabled={!canGoPrev}
                className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary hover:shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed group active:scale-90"
              >
                <FontAwesomeIcon
                  icon={faChevronLeft}
                  className="text-xs group-hover:-translate-x-0.5 transition-transform"
                />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(currentPageIndex + 1)}
                disabled={!canGoNext}
                className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary hover:shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed group active:scale-90"
              >
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="text-xs group-hover:translate-x-0.5 transition-transform"
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Table */}
      {columns && (
        <div className="md:hidden bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-4">
          <div className="overflow-x-auto hide_scrollbar">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="bg-gray-50/80">
                <tr className="h-12 border-b border-gray-100">
                  <th className="pl-4 w-10 text-[10px] font-bold text-gray-400 uppercase font-poppins">
                    #
                  </th>
                  {columns.map((column, index) => (
                    <th
                      className="px-3 text-[10px] font-bold text-gray-400 uppercase font-poppins"
                      key={index}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs font-lato">
                {children}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legacy Pagination (preserved for existing usages) */}
      {!hasNewPagination && data && data.total > PER_PAGE && changePage && (
        <div className="flex justify-between items-center mt-6 px-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-medium font-lato">
              Page
            </span>
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
              <input
                className="w-full text-center text-sm font-bold text-gray-900 bg-transparent outline-none font-poppins"
                type="text"
                value={currentPage}
                onBlur={handleBlur}
                onKeyUp={(e) => onKeyChange(e.key)}
                onChange={(e) => onInputChange(e.target.value)}
              />
            </div>
            <span className="text-xs text-gray-400 font-medium font-lato">
              of {data.pages}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPrev}
              disabled={data.current_page === 1}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary hover:shadow-md transition-all disabled:opacity-30 disabled:hover:shadow-none disabled:cursor-not-allowed group active:scale-90"
            >
              <FontAwesomeIcon
                icon={faChevronLeft}
                className="text-xs group-hover:-translate-x-0.5 transition-transform"
              />
            </button>
            <button
              onClick={goToNext}
              disabled={data.current_page >= data.pages}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary hover:shadow-md transition-all disabled:opacity-30 disabled:hover:shadow-none disabled:cursor-not-allowed group active:scale-90"
            >
              <FontAwesomeIcon
                icon={faChevronRight}
                className="text-xs group-hover:translate-x-0.5 transition-transform"
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
