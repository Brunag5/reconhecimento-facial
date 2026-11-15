
import { useState, useRef, useCallback, useEffect } from "react";
import * as faceapi from "face-api.js";
import {
  Person,
  initialPersons,
  getPersonPhotoSources,
  BodyMark,
} from "@/data/persons";
import {
  FACE_MATCH_DISTANCE_THRESHOLD,
  distanceToSimilarityPercent,
  logFaceMatchDebug,
} from "@/lib/faceDescriptorSimilarity";

interface LabeledPerson {
  person: Person;
  descriptor: Float32Array;
}

const STORAGE_KEY = "reconhecimento-facial-persons";

const REMOTE_MODEL_BASE =
  "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";

function loadSavedPersons(): Person[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Não foi possível recuperar os cadastros:", error);
  }

  return initialPersons;
}

async function descriptorFromImage(
  imageSrc: string
): Promise<Float32Array | null> {
  const img = await faceapi.fetchImage(imageSrc);

 const detection = await faceapi
  .detectSingleFace(
    img,
    new faceapi.SsdMobilenetv1Options({
      minConfidence: 0.2,
    })
  )
  .withFaceLandmarks()
  .withFaceDescriptor();

  return detection?.descriptor ?? null;
}

async function addPersonDescriptors(
  person: Person,
  labeled: LabeledPerson[]
) {
  for (const photoSrc of getPersonPhotoSources(person)) {
    try {
      const descriptor = await descriptorFromImage(photoSrc);

      if (descriptor) {
        labeled.push({ person, descriptor });
      }
    } catch (error) {
      console.warn(
        `Não foi possível processar a foto de ${person.name}:`,
        error
      );
    }
  }
}

async function loadFaceModels(modelBaseUri: string) {
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(modelBaseUri),
    faceapi.nets.faceLandmark68Net.loadFromUri(modelBaseUri),
    faceapi.nets.faceRecognitionNet.loadFromUri(modelBaseUri),
  ]);
}

export function useFaceRecognition() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [persons, setPersons] = useState<Person[]>(loadSavedPersons);

  const labeledRef = useRef<LabeledPerson[]>([]);
  const [dbReady, setDbReady] = useState(false);

  // Carrega os modelos de reconhecimento facial.
  useEffect(() => {
    const load = async () => {
      const base = import.meta.env.BASE_URL.endsWith("/")
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;

      const localModels = `${base}models`;

      try {
        await loadFaceModels(localModels);
      } catch (error) {
        console.warn(
          "Modelos locais indisponíveis. Tentando carregar pela internet:",
          error
        );

        await loadFaceModels(REMOTE_MODEL_BASE);
      }

      setModelsLoaded(true);
      setLoading(false);
    };

    load().catch((error) => {
      console.error("Erro ao carregar os modelos:", error);

      const message =
        error instanceof Error ? error.message : String(error);

      setLoadError(message);
      setLoading(false);
    });
  }, []);

  // Salva os cadastros no navegador sempre que a lista é atualizada.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persons));
    } catch (error) {
      console.error("Não foi possível salvar os cadastros:", error);
    }
  }, [persons]);

  // Cria a base de descritores faciais.
  const buildDatabase = useCallback(async () => {
    if (!modelsLoaded) return;

    setLoading(true);
    setDbReady(false);

    const labeled: LabeledPerson[] = [];

    try {
      for (const person of persons) {
        await addPersonDescriptors(person, labeled);
      }

      labeledRef.current = labeled;
    } catch (error) {
      console.error("Erro ao montar a base facial:", error);
    } finally {
      setDbReady(true);
      setLoading(false);
    }
  }, [modelsLoaded, persons]);

  useEffect(() => {
    if (modelsLoaded) {
      buildDatabase();
    }
  }, [modelsLoaded, buildDatabase]);

  // Reconhece um único rosto.
  const matchFace = useCallback(
    async (
      imageElement:
        | HTMLImageElement
        | HTMLCanvasElement
        | HTMLVideoElement
    ): Promise<{ person: Person; distance: number } | null> => {
      if (!dbReady || labeledRef.current.length === 0) {
        return null;
      }

      const detection = await faceapi
        .detectSingleFace(imageElement)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) return null;

      let bestMatch: {
        person: Person;
        distance: number;
      } | null = null;

      for (const entry of labeledRef.current) {
        const distance = faceapi.euclideanDistance(
          detection.descriptor,
          entry.descriptor
        );

        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = {
            person: entry.person,
            distance,
          };
        }
      }

      if (
        bestMatch &&
        bestMatch.distance < FACE_MATCH_DISTANCE_THRESHOLD
      ) {
        logFaceMatchDebug(
          "matchFace",
          bestMatch.distance,
          distanceToSimilarityPercent(bestMatch.distance)
        );

        return bestMatch;
      }

      return null;
    },
    [dbReady]
  );

  // Reconhece todos os rostos encontrados na imagem.
  const matchAllFaces = useCallback(
    async (
      imageElement:
        | HTMLImageElement
        | HTMLCanvasElement
        | HTMLVideoElement
    ): Promise<
      Array<{
        person: Person | null;
        distance: number | null;
        box: {
          x: number;
          y: number;
          width: number;
          height: number;
        };
      }>
    > => {
      if (!dbReady) return [];

      const detections = await faceapi
        .detectAllFaces(imageElement)
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections || detections.length === 0) {
        return [];
      }

      return detections.map((det, index) => {
        const { x, y, width, height } = det.detection.box;

        let bestMatch: {
          person: Person;
          distance: number;
        } | null = null;

        for (const entry of labeledRef.current) {
          const distance = faceapi.euclideanDistance(
            det.descriptor,
            entry.descriptor
          );

          if (!bestMatch || distance < bestMatch.distance) {
            bestMatch = {
              person: entry.person,
              distance,
            };
          }
        }

        if (
          bestMatch &&
          bestMatch.distance < FACE_MATCH_DISTANCE_THRESHOLD
        ) {
          const similarity = distanceToSimilarityPercent(
            bestMatch.distance
          );

          logFaceMatchDebug(
            `matchAllFaces#${index} -> ${bestMatch.person.name}`,
            bestMatch.distance,
            similarity
          );

          return {
            person: bestMatch.person,
            distance: bestMatch.distance,
            box: { x, y, width, height },
          };
        }

        return {
          person: null,
          distance: null,
          box: { x, y, width, height },
        };
      });
    },
    [dbReady]
  );

  // Cadastra uma nova pessoa.
  const addPerson = useCallback(
    async (
      name: string,
      imageSrc: string,
      options?: {
        notes?: string;
        bodyMarks?: Omit<BodyMark, "id">[];
        additionalPhotos?: string[];
      }
    ) => {
      const newPerson: Person = {
        id: crypto.randomUUID(),
        name: name.trim(),
        imageSrc,
        notes: options?.notes || "",
        bodyMarks: (options?.bodyMarks ?? []).map((mark) => ({
          ...mark,
          id: crypto.randomUUID(),
          observation: mark.observation?.trim() || "",
        })),
        additionalPhotos: options?.additionalPhotos ?? [],
        registeredAt: new Date().toISOString().split("T")[0],
      };

      setPersons((previous) => [...previous, newPerson]);

      return newPerson;
    },
    []
  );

  return {
    modelsLoaded,
    loading,
    loadError,
    dbReady,
    persons,
    matchFace,
    matchAllFaces,
    addPerson,
  };
}
