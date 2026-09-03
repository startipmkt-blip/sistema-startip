import { useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { useAuth } from '@/shared/auth/AuthProvider';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';

interface Props {
  area: string;        // ex: 'diretoria', 'empresas'
  icone?: string;
  titulo: string;
  onOk: () => void;
}

async function verificarPin(area: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verificar_pin' as never, { area, pin_plain: pin } as never);
  if (error) throw error;
  return data === true;
}

async function definirPin(area: string, pin: string): Promise<void> {
  const { error } = await supabase.rpc('definir_pin' as never, { area, pin_plain: pin } as never);
  if (error) throw error;
}

// Componente reutilizável: solicita PIN antes de liberar a área.
export function PinGate({ area, icone = '🔒', titulo, onOk }: Props) {
  const { isAdmin } = useAuth();
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [modoDefinir, setModoDefinir] = useState(false);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function tentar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      const ok = await verificarPin(area, pin);
      if (ok) onOk();
      else setErro('PIN incorreto.');
    } catch (err) {
      setErro((err as Error).message ?? 'Erro ao verificar PIN.');
    }
  }

  async function salvarPin(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (pin1.length < 4) { setErro('Use ao menos 4 dígitos.'); return; }
    if (pin1 !== pin2)   { setErro('Os PINs não coincidem.'); return; }
    setSalvando(true);
    try {
      await definirPin(area, pin1);
      setModoDefinir(false);
      setPin1(''); setPin2('');
      alert('PIN salvo. Use-o para entrar.');
    } catch (err) {
      setErro((err as Error).message ?? 'Erro ao salvar PIN.');
    } finally { setSalvando(false); }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-4 text-center">
          <div className="mb-2 text-3xl">{icone}</div>
          <h1 className="text-lg font-semibold text-slate-100">{titulo}</h1>
          <p className="mt-1 text-xs text-slate-400">Área restrita. Informe o PIN.</p>
        </div>

        {!modoDefinir ? (
          <form onSubmit={tentar} className="space-y-3">
            <Input id="pin" type="password" label="PIN" value={pin}
                   onChange={(e) => setPin(e.target.value)} autoComplete="off" inputMode="numeric" />
            {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
            <Button type="submit" className="w-full">Entrar</Button>
            {isAdmin && (
              <button type="button" onClick={() => setModoDefinir(true)}
                      className="w-full text-xs text-brand-300 hover:underline">
                Definir/alterar PIN (admin)
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={salvarPin} className="space-y-3">
            <Input id="p1" type="password" label="Novo PIN" value={pin1} onChange={(e) => setPin1(e.target.value)} />
            <Input id="p2" type="password" label="Repetir PIN" value={pin2} onChange={(e) => setPin2(e.target.value)} />
            {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" type="button" className="flex-1" onClick={() => setModoDefinir(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
