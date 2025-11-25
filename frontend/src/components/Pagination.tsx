import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="p-4 border-t border-gray-800 bg-black z-10">
      <div className="flex justify-center space-x-2 flex-wrap gap-y-2">
        <button 
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &lt;
        </button>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
          // Simple logic to show first, last, current, and neighbors
          if (
            page === 1 || 
            page === totalPages || 
            (page >= currentPage - 1 && page <= currentPage + 1)
          ) {
            return (
              <button 
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 rounded border ${currentPage === page ? 'bg-red-600 border-red-600 text-white font-bold' : 'border-gray-700 text-gray-400 hover:text-white hover:border-white'}`}
              >
                {page}
              </button>
            );
          } else if (
            (page === currentPage - 2 && currentPage > 3) || 
            (page === currentPage + 2 && currentPage < totalPages - 2)
          ) {
             return <span key={page} className="px-2 py-1 text-gray-500">...</span>;
          }
          return null;
        })}

        <button 
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default Pagination;
