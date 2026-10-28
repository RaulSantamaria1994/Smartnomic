/** En el navegador, descarga el archivo. */
export async function saveJsonFile(name: string, content: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Se deja un momento para que el navegador empiece la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
