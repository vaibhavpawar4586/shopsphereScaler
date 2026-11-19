import { Link } from 'react-router-dom';

const NotFound = () => (
  <main className="page empty-state">
    <h2>404 - page not found</h2>
    <p>The page you are looking for doesn&apos;t exist.</p>
    <Link to="/" className="btn">Go to the shop</Link>
  </main>
);

export default NotFound;
