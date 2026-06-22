declare module 'html-to-pdf-js' {
  type HtmlToPdfOptions = {
    filename?: string;
    margin?: number | [number, number, number, number];
    image?: {
      type?: 'jpeg' | 'png' | string;
      quality?: number;
    };
    enableLinks?: boolean;
    html2canvas?: Record<string, unknown>;
    jsPDF?: Record<string, unknown>;
  };

  type HtmlToPdfWorker = {
    from(source: Element | string): HtmlToPdfWorker;
    save(): Promise<unknown>;
  };

  export default function htmlToPdf(
    source?: Element | string,
    options?: HtmlToPdfOptions
  ): HtmlToPdfWorker;
}
