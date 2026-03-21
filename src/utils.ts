import {
  Application,
  getApplications,
  getDefaultApplication,
  Icon,
  showToast,
  Toast,
} from "@vicinae/api";
import { request } from "undici";
import { EXTENSION_ICON_MAP, genericFileIcon } from "./icons";

export const USER = process.env.USER ?? "";
export const HOME_DIRECTORY = USER ? `/home/${USER}/` : "/home/";

const SEARCH_ENDPOINT = "http://localhost:43654/search";
const SEARCH_RESULT_LIMIT = "12";
const DEFAULT_QUERY = ".pdf";

export type PrettyHit = {
  fileName: string;
  filePath: string;
  curatedPath: string;
  defaultApp: Application | null;
  applications: Application[] | null;
};

export type Hit = {
  id: string;
  index: string;
  score: number;
};

export type Data = {
  hits: Hit[];
};

/** Normalizes a folder input into an absolute path under the current home directory. */
export function cleanFolderSpecifier(folderSpecifier?: string | null): string {
  const trimmedFolderSpecifier = folderSpecifier?.trim() ?? "";
  if (!trimmedFolderSpecifier) {
    return HOME_DIRECTORY;
  }

  if (trimmedFolderSpecifier.startsWith("/")) {
    return trimmedFolderSpecifier;
  }

  return `${HOME_DIRECTORY}${trimmedFolderSpecifier}`;
}

export async function fetchData(
  query: string,
  searchMode: string,
  folder: string = HOME_DIRECTORY,
): Promise<Hit[]> {
  const normalizedQuery = query.trim() || DEFAULT_QUERY;
  const fetchParams = new URLSearchParams({
    q: normalizedQuery,
    limit: SEARCH_RESULT_LIMIT,
    fuzzy: "true",
    type: searchMode,
    folder,
  });

  try {
    const { statusCode, body } = await request(
      `${SEARCH_ENDPOINT}?${fetchParams.toString()}`,
    );
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`Search request failed with status ${statusCode}`);
    }

    const data: Data = (await body.json()) as Data;
    return data.hits;
  } catch (error) {
    console.error("Error fetching data:", error);
    showToast(Toast.Style.Failure, "Failed to fetch data");
    return [];
  }
}

export function splitPath(filePath: string): string[] {
  const parts = filePath.split("/");
  return parts.filter((part) => part.trim() !== "");
}

export function getCuratedPath(pathList: string[]): string {
  const curatedPath = pathList.slice(0, -1).join("/");
  return curatedPath.replace(`home/${USER}/`, "~/");
}

function getExtensionKey(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  if (!lower) return null;
  if (lower === "dockerfile") return "dockerfile";
  if (lower.endsWith(".d.ts")) return "d.ts";

  const dotIndex = lower.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === lower.length - 1) return null;
  return lower.slice(dotIndex + 1);
}

export function getHitIcon(hit: PrettyHit): Icon | string {
  const extensionIcon = EXTENSION_ICON_MAP[getExtensionKey(hit.fileName) ?? ""];
  return extensionIcon ?? hit.defaultApp?.icon ?? genericFileIcon;
}

export async function prettifyData(hits: Hit[]): Promise<PrettyHit[]> {
  return Promise.all(
    hits.map(async (hit) => {
      const pathList = splitPath(hit.id);
      const fileName = pathList[pathList.length - 1] ?? hit.id;

      let defaultApp: Application | null = null;
      let applications: Application[] | null = null;

      try {
        defaultApp = await getDefaultApplication(hit.id);
        applications = await getApplications(hit.id);
      } catch {
        defaultApp = null;
      }

      return {
        fileName,
        filePath: hit.id,
        curatedPath: getCuratedPath(pathList),
        defaultApp,
        applications,
      };
    }),
  );
}
