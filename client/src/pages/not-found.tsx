import { Link } from "wouter";
export default function NotFound() {
  return (
    <div className="nf">
      <div className="eyebrow">404</div>
      <h1 className="page-title">This layer doesn’t exist.</h1>
      <p className="lede">The teardown has five layers. Pick one from the sidebar or head back to the overview.</p>
      <div><Link className="btn primary" href="/">Back to overview</Link></div>
    </div>
  );
}
