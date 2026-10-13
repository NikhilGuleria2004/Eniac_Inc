interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  const showEllipsisStart = currentPage > 3;
  const showEllipsisEnd = currentPage < totalPages - 2;

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (showEllipsisStart) pages.push("...");
    if (currentPage > 2 && currentPage < totalPages - 1) {
      pages.push(currentPage - 1, currentPage, currentPage + 1);
    } else if (currentPage <= 2) {
      pages.push(2, 3);
    } else {
      pages.push(totalPages - 2, totalPages - 1);
    }
    if (showEllipsisEnd) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <nav className={`flex flex-wrap items-center gap-1 ${className}`} aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="btn btn-secondary py-1 px-2 text-xs disabled:opacity-50"
      >
        Prev
      </button>
      {pages.map((page, index) =>
        typeof page === "number" ? (
          <button
            key={index}
            onClick={() => onPageChange(page)}
            className={`btn py-1 px-3 text-xs ${
              currentPage === page ? "btn-primary" : "btn-secondary"
            }`}
          >
            {page}
          </button>
        ) : (
          <span key={index} className="px-2 text-gray-400 text-xs">
            {page}
          </span>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="btn btn-secondary py-1 px-2 text-xs disabled:opacity-50"
      >
        Next
      </button>
    </nav>
  );
}
