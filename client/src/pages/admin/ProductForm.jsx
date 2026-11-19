import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Loader from '../../components/loader/Loader';
import ProductImage from '../../components/productImage/ProductImage';
import AdminNav from './AdminNav';
import api, { getErrorMessage } from '../../utils/api';
import urlConfig from '../../utils/urlConfig';
import { formatPrice } from '../../utils/format';
import './admin.css';

const EMPTY = {
  name: '',
  brand: '',
  description: '',
  price: '',
  discount: '0',
  categories: '',
  productImages: '',
  stock_quantity: '',
};

/** Create a product (/admin/products/new) or edit one (/admin/products/:id/edit). */
const ProductForm = () => {
  const { productId } = useParams();
  const isEdit = Boolean(productId);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    // The admin endpoint also returns hidden products.
    api
      .get(`${urlConfig.ADMIN_PRODUCT_URL}/${productId}`)
      .then((res) => {
        const p = res.data.data;
        if (!p) throw new Error('Product not found');
        setForm({
          name: p.name,
          brand: p.brand,
          description: p.description,
          price: String(p.price),
          discount: String(p.discount || 0),
          categories: p.categories.join(', '),
          productImages: p.productImages.join('\n'),
          stock_quantity: String(p.stock_quantity),
        });
      })
      .catch((err) => setError(getErrorMessage(err, err.message)))
      .finally(() => setLoading(false));
  }, [isEdit, productId]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const price = Number(form.price) || 0;
  const discount = Number(form.discount) || 0;
  const firstImage = form.productImages.split('\n').map((s) => s.trim()).find(Boolean);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      description: form.description.trim(),
      price,
      discount,
      stock_quantity: Number.parseInt(form.stock_quantity, 10),
      categories: form.categories.split(',').map((c) => c.trim()).filter(Boolean),
      productImages: form.productImages.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (isEdit) await api.patch(`${urlConfig.ALL_PRODUCT_URL}/${productId}`, payload);
      else await api.post(urlConfig.ALL_PRODUCT_URL, payload);
      navigate('/admin/products');
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <main className="page">
      <h1 className="page-title">{isEdit ? 'Edit product' : 'Add product'}</h1>
      <AdminNav />
      <form className="two-col" onSubmit={submit}>
        <section className="card">
          <div className="form-grid">
            <div className="field field-full">
              <label htmlFor="name">Name</label>
              <input id="name" value={form.name} onChange={update('name')} required maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="brand">Brand</label>
              <input id="brand" value={form.brand} onChange={update('brand')} required maxLength={60} />
            </div>
            <div className="field">
              <label htmlFor="categories">Categories</label>
              <input id="categories" value={form.categories} onChange={update('categories')} required placeholder="electronics, accessories" />
              <small>Separate with commas.</small>
            </div>
            <div className="field">
              <label htmlFor="price">Price / MRP (₹)</label>
              <input id="price" type="number" min="1" step="0.01" value={form.price} onChange={update('price')} required />
            </div>
            <div className="field">
              <label htmlFor="discount">Discount (₹ off)</label>
              <input id="discount" type="number" min="0" step="0.01" value={form.discount} onChange={update('discount')} />
            </div>
            <div className="field">
              <label htmlFor="stock">Stock quantity</label>
              <input id="stock" type="number" min="0" step="1" value={form.stock_quantity} onChange={update('stock_quantity')} required />
            </div>
            <div className="field field-full">
              <label htmlFor="description">Description</label>
              <textarea id="description" rows={6} value={form.description} onChange={update('description')} required maxLength={2000} />
            </div>
            <div className="field field-full">
              <label htmlFor="images">Image URLs</label>
              <textarea id="images" rows={3} value={form.productImages} onChange={update('productImages')} placeholder="https://..." />
              <small>One http(s) link per line, up to 8. The first one is the main image.</small>
            </div>
          </div>
        </section>

        <aside className="card stack">
          <div className="admin-preview">
            <ProductImage src={firstImage} alt="Preview" />
          </div>
          <div className="summary-line"><span>Price</span><span>{formatPrice(price)}</span></div>
          <div className="summary-line"><span>Discount</span><span>− {formatPrice(discount)}</span></div>
          <div className="summary-line summary-total"><span>Selling price</span><span>{formatPrice(price - discount)}</span></div>
          {discount >= price && price > 0 && <div className="alert alert-error">Discount must be less than the price.</div>}
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="btn btn-block" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}</button>
          <Link to="/admin/products" className="cart-continue">Cancel</Link>
        </aside>
      </form>
    </main>
  );
};

export default ProductForm;
