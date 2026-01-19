import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Plus, Sparkles } from "lucide-react";
import type { Habit } from "@/types";

interface AddHabitDialogProps {
  onAdd: (name: string, frequency: Habit["frequency"]) => void;
}

export function AddHabitDialog({ onAdd }: AddHabitDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<Habit["frequency"]>("daily");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), frequency);
      setName("");
      setFrequency("daily");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="glow" size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Novo Hábito
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Criar Novo Hábito
          </DialogTitle>
          <DialogDescription>
            Adicione um novo hábito para acompanhar seu progresso diariamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <label
              htmlFor="habit-name"
              className="text-sm font-medium text-foreground"
            >
              Nome do hábito
            </label>
            <Input
              id="habit-name"
              placeholder="Ex: Ler 30 minutos, Meditar, Academia..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="habit-frequency"
              className="text-sm font-medium text-foreground"
            >
              Frequência
            </label>
            <Select
              id="habit-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Habit["frequency"])}
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </Select>
          </div>

          <DialogFooter className="mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="glow" disabled={!name.trim()}>
              Criar Hábito
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
