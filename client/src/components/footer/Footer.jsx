import './footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="footer-inner">
      <span>© {new Date().getFullYear()} ShopSphere</span>
      <span className="muted">Payments secured by Razorpay · Free shipping on orders above ₹999</span>
    </div>
  </footer>
);

export default Footer;
