import AppRoutes from './routes/AppRoutes.jsx';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </div>
  );
}