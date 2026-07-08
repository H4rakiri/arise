// Полупрозрачная системная панель со срезанными углами и светящейся обводкой (§8.1)
export default function Panel({ title, children, className = '', ...rest }) {
  return (
    <section className={`panel ${className}`} {...rest}>
      {title && <h2 className="panel-title">{title}</h2>}
      {children}
    </section>
  );
}
