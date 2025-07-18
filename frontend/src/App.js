import { ScanForm } from "./components/ScanForm.jsx";
import { AmassForm } from "./components/AmassForm.jsx";
import { CombinedForm } from "./components/CombinedForm.jsx";
import { ScanHistory } from "./components/ScanHistory.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";  
import './App.css';

function App() {
  return (
    <ErrorBoundary> 
      <main className="app-container">
        <h1 className="main-title">OSINT Scanner</h1>

        <section className="form-section">
          <ScanForm />
        </section>

        <section className="form-section">
          <AmassForm />
        </section>

        <section className="form-section">
          <CombinedForm />
        </section>

        <section className="form-section">
          <ScanHistory />
        </section>
      </main>
    </ErrorBoundary>
  );
}

export default App;
