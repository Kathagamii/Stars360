import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Stars360 crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-screen w-full flex-col items-center justify-center gap-4 bg-space-950 px-6 text-center text-slate-200">
          <div className="text-4xl">🌌</div>
          <h1 className="text-lg font-medium">Что-то пошло не так</h1>
          <p className="max-w-sm text-sm text-slate-400">
            Приложению не удалось отрисовать эту часть неба. Попробуйте перезагрузить страницу — обычно
            это помогает.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-full bg-accent-500 px-5 py-2 text-sm font-medium text-space-950 transition hover:bg-accent-400"
          >
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
