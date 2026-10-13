import { useEffect, useState, type ImgHTMLAttributes } from 'react';

type Fundo = 'preto' | 'branco' | null;

// Uma análise por URL, compartilhada por todas as telas.
const cache = new Map<string, Promise<Fundo>>();

const LADO = 48;
const LIMIAR_CLARO = 150; // luminância média (0-255) acima da qual a logo é "clara"

function analisar(src: string): Promise<Fundo> {
  return new Promise((resolve) => {
    const img = new Image();
    // Sem CORS o canvas fica "sujo" e não dá pra ler os pixels; o bucket de logos é público.
    img.crossOrigin = 'anonymous';
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = LADO;
        canvas.height = LADO;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, LADO, LADO);
        const { data } = ctx.getImageData(0, 0, LADO, LADO);
        let transparentes = 0;
        let peso = 0;
        let soma = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 32) { transparentes++; continue; }
          soma += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) * a;
          peso += a;
        }
        // Logo sem transparência já traz o próprio fundo.
        if (peso === 0 || transparentes / (LADO * LADO) < 0.03) return resolve(null);
        resolve(soma / peso > LIMIAR_CLARO ? 'preto' : 'branco');
      } catch {
        resolve(null);
      }
    };
    img.src = src;
  });
}

function useFundoLogo(src: string | undefined): Fundo {
  const [fundo, setFundo] = useState<Fundo>(null);
  useEffect(() => {
    setFundo(null);
    if (!src) return;
    let vivo = true;
    let p = cache.get(src);
    if (!p) { p = analisar(src); cache.set(src, p); }
    void p.then((f) => { if (vivo) setFundo(f); });
    return () => { vivo = false; };
  }, [src]);
  return fundo;
}

/** Logo do cliente: logo clara ganha fundo preto, logo escura ganha fundo branco. */
export function LogoCliente({ src, className = '', alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const fundo = useFundoLogo(src);
  const bg = fundo === 'preto' ? 'bg-black' : fundo === 'branco' ? 'bg-white' : '';
  return <img src={src} alt={alt} className={`${className} ${bg}`} {...props} />;
}
