import { useLocation, useParams } from "react-router-dom";

export function PlaceholderPage({ title }: { title: string }) {
  const location = useLocation();
  const params = useParams();
  const id = Object.values(params)[0];

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>
      <div className="card">
        <p className="text-sm text-gray-500">
          {id
            ? `${title} detail — ID: ${id}`
            : `${title} module — coming in a later phase.`}
        </p>
        <p className="text-xs text-gray-400 mt-2">Route: {location.pathname}</p>
      </div>
    </div>
  );
}
