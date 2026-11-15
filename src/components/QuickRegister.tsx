
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, Upload, X, UserPlus } from "lucide-react";

export interface RegisterPayload {
  name: string;
  notes: string;
  bodyMarks: [];
  additionalPhotos: string[];
}

interface QuickRegisterProps {
  capturedImage: string;
  onRegister: (payload: RegisterPayload) => void | Promise<void>;
  onCancel: () => void;
}

export default function QuickRegister({
  capturedImage,
  onRegister,
  onCancel,
}: QuickRegisterProps) {
  const [name, setName] = useState("");
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAdditionalPhotos((current) => {
            if (current.length >= 5) return current;
            return [...current, reader.result as string];
          });
        }
      };

      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  function removePhoto(index: number) {
    setAdditionalPhotos((current) =>
      current.filter((_, photoIndex) => photoIndex !== index)
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      alert("Digite o nome da pessoa.");
      return;
    }

    setSaving(true);

    try {
      await onRegister({
        name: name.trim(),
        notes: "",
        bodyMarks: [],
        additionalPhotos,
      });
    } catch (error) {
      console.error("Erro ao cadastrar pessoa:", error);
      alert("Não foi possível realizar o cadastro. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-2 mb-6 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={18} />
        Voltar
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold">Cadastrar pessoa</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Informe o nome e confirme as imagens para o reconhecimento facial.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Nome da pessoa
          </label>

          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Digite o nome"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Imagem capturada
          </label>

          <img
            src={capturedImage}
            alt="Imagem capturada para cadastro"
            className="w-full max-w-xs rounded-lg border object-cover"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Imagens adicionais (opcional)
          </label>

          <p className="text-xs text-muted-foreground mb-3">
            Você pode adicionar até 5 imagens para melhorar o reconhecimento.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={additionalPhotos.length >= 5}
            className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            <Upload size={18} />
            Adicionar imagens
          </button>

          {additionalPhotos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {additionalPhotos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo}
                    alt={`Imagem adicional ${index + 1}`}
                    className="w-full h-28 rounded-md object-cover border"
                  />

                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1"
                    aria-label="Remover imagem"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-3 font-medium hover:opacity-90 disabled:opacity-50"
        >
          <UserPlus size={18} />
          {saving ? "Cadastrando..." : "Cadastrar pessoa"}
        </button>
      </form>
    </div>
  );
}
