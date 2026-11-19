import './pagination.css';

const Pagination = ({ totalPages, currentPage, paginate }) => {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <nav className="page-container" aria-label="Pagination">
      <button type="button" className="pagination-btn" onClick={() => paginate(currentPage - 1)} disabled={currentPage <= 1}>
        Previous
      </button>
      {Array.from({ length: totalPages }).map((_, index) => {
        const page = index + 1;
        return (
          <button
            type="button"
            key={page}
            className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
            aria-current={page === currentPage ? 'page' : undefined}
            onClick={() => paginate(page)}
          >
            {page}
          </button>
        );
      })}
      <button type="button" className="pagination-btn" onClick={() => paginate(currentPage + 1)} disabled={currentPage >= totalPages}>
        Next
      </button>
    </nav>
  );
};

export default Pagination;
