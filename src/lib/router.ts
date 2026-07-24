import type { Route } from "./types";

export function parsePath(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/" || path === "") {
    return { name: "home" };
  }

  const instanceMatch = path.match(/^\/instance\/([^/]+)$/);
  if (instanceMatch) {
    return { name: "instance", uuid: decodeURIComponent(instanceMatch[1]) };
  }

  return { name: "not-found" };
}

export function toPath(route: Route): string {
  switch (route.name) {
    case "home":
      return "/";
    case "instance":
      return `/instance/${encodeURIComponent(route.uuid)}`;
    default:
      return "/";
  }
}

export function navigate(route: Route, replace = false) {
  const path = toPath(route);
  if (replace) {
    window.history.replaceState({ route }, "", path);
  } else {
    window.history.pushState({ route }, "", path);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}
