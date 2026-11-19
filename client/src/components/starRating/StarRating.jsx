import { FaStar, FaRegStar, FaStarHalfAlt } from 'react-icons/fa';
import './starRating.css';

/**
 * Shows a 0-5 star rating. With onChange it becomes an input for choosing a rating.
 */
const StarRating = ({ value = 0, count, onChange, size = 'sm' }) => {
  if (onChange) {
    return (
      <div className={`stars stars-${size} stars-input`} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onClick={() => onChange(star)}
          >
            {star <= value ? <FaStar /> : <FaRegStar />}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`stars stars-${size}`} aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        if (value >= star) return <FaStar key={star} />;
        if (value >= star - 0.5) return <FaStarHalfAlt key={star} />;
        return <FaRegStar key={star} />;
      })}
      {count !== undefined && <span className="stars-count">({count})</span>}
    </div>
  );
};

export default StarRating;
