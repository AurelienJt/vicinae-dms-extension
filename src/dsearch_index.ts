import {
  Arguments,
  clearSearchBar,
  LaunchProps,
  showToast,
  Toast,
} from "@vicinae/api";
import { request } from "undici";

const REINDEX_ENDPOINT = "http://localhost:43654/reindex"; //FIXME: One day PORT should be magic number...
const SYNC_ENDPOINT = "http://localhost:43654/sync";

export default async function dsearchIndex(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  if (!props.arguments.reindex_mode) {
    return;
  }
  if (props.arguments.reindex_mode === "quick") {
    const toast = await showToast(
      Toast.Style.Animated,
      "Starting Quick Indexing...",
    );
    try {
      await request(SYNC_ENDPOINT, { method: "POST" });
      toast.style = Toast.Style.Success;
      toast.title = "Quick reindexing started successfully";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Sync failed";
      console.error("Error during sync:", error);
    }
  } else if (props.arguments.reindex_mode === "full") {
    const toast = await showToast(
      Toast.Style.Animated,
      "Starting Full Indexing...",
    );
    try {
      await request(REINDEX_ENDPOINT, { method: "POST" });
      toast.style = Toast.Style.Success;
      toast.title = "Full reindexing started successfully";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Full reindexing failed";
      console.error("Error during full reindexing:", error);
    }
  }
  clearSearchBar();
  return;
}
