import './loader.css';

const Loader = ({ label = 'Loading' }) => (
  <div className="loader-wrap" role="status" aria-live="polite">
    <div className="loader" />
    <span className="loader-label">{label}…</span>
  </div>
);

export default Loader;
