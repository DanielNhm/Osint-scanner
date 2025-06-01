import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Caught by ErrorBoundary:", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#2a2a2a', borderRadius: '8px', color: '#f88' }}>
          <h2>Something went wrong </h2>
          <p>We encountered an unexpected error. Please try refreshing the page.</p>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ccc' }}>
            {this.state.error?.toString()}
            {"\n"}
            {this.state.info?.componentStack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
