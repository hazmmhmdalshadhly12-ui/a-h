import { Component } from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';

/** حاجز أخطاء — لو حصل أي خطأ JS في أي صفحة بيعرض رسالة بدل شاشة بيضاء */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('[ErrorBoundary]', error);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-lens bg-danger/15 text-danger">
            <Icon name="info" className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-xl font-black text-paper">حصلت مشكلة بسيطة</h1>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              حصل خطأ غير متوقع أثناء عرض الصفحة. حدّث الصفحة أو ارجع وحاول تاني — غالباً بتحل الموضوع.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>تحديث الصفحة</Button>
            <Button variant="secondary" onClick={this.handleReset}>حاول مرة أخرى</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}