import { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useEnviarLocalizacao } from '@/modules/crm/api/crmApi';

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string;
}

export function LocalizacaoModal({ open, onClose, leadId }: Props) {
  const enviar = useEnviarLocalizacao();
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pegando, setPegando] = useState(false);

  function pegarMinha() {
    setErro(null);
    if (!navigator.geolocation) { setErro('Geolocalização não disponível.'); return; }
    setPegando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setPegando(false);
      },
      (e) => { setErro(e.message); setPegando(false); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const la = Number(lat.replace(',', '.'));
    const ln = Number(lng.replace(',', '.'));
    if (!isFinite(la) || !isFinite(ln)) { setErro('Latitude e longitude inválidas.'); return; }
    try {
      await enviar.mutateAsync({ leadId, latitude: la, longitude: ln, nome: nome.trim() || null, endereco: endereco.trim() || null });
      setLat(''); setLng(''); setNome(''); setEndereco('');
      onClose();
    } catch (e) { setErro((e as Error).message); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="📍 Enviar localização"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={enviar.isPending}>{enviar.isPending ? 'Enviando…' : 'Enviar'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input id="lat" label="Latitude" placeholder="-23.5505" value={lat} onChange={(e) => setLat(e.target.value)} />
          <Input id="lng" label="Longitude" placeholder="-46.6333" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
        <Input id="nome" label="Nome do local (opcional)" placeholder="Startip Marketing" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input id="end" label="Endereço (opcional)" placeholder="Av. Paulista, 1000 - São Paulo, SP" value={endereco} onChange={(e) => setEndereco(e.target.value)} />

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={pegarMinha} disabled={pegando}
            className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10">
            {pegando ? '⏳ pegando…' : '📱 usar minha localização'}
          </button>
          {lat && lng && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + ',' + lng)}`}
              target="_blank" rel="noopener noreferrer"
              className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >🗺 abrir no Google Maps</a>
          )}
        </div>

        {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
      </form>
    </Modal>
  );
}
