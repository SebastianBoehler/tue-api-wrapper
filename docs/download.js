const REPOSITORY = "SebastianBoehler/tue-api-wrapper";
const RELEASES_URL = `https://github.com/${REPOSITORY}/releases`;
const LATEST_RELEASE_API = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;

const PLATFORM_MATCHERS = {
  macos: [/mac|darwin|osx/i, /\.(dmg|zip)$/i],
  windows: [/win|windows/i, /\.(exe|msi)$/i],
  linux: [/linux|appimage|ubuntu|debian|fedora/i, /\.(appimage|deb|rpm)$/i],
};

const PLATFORM_LABELS = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
};

const statusElement = document.querySelector("#release-status");
const primaryDownload = document.querySelector("#primary-download");

initDownloadPage();

async function initDownloadPage() {
  const platform = detectPlatform();

  try {
    const release = await fetchLatestRelease();
    const assetsByPlatform = groupAssetsByPlatform(release.assets ?? []);
    renderPlatformCards(assetsByPlatform);
    renderPrimaryDownload(platform, assetsByPlatform, release.html_url);
  } catch (error) {
    renderReleaseFallback(error);
  }
}

function detectPlatform() {
  const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || "";
  if (/mac/i.test(platform)) {
    return "macos";
  }
  if (/win/i.test(platform)) {
    return "windows";
  }
  if (/linux|x11/i.test(platform)) {
    return "linux";
  }
  return null;
}

async function fetchLatestRelease() {
  const response = await fetch(LATEST_RELEASE_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status}`);
  }
  return response.json();
}

function groupAssetsByPlatform(assets) {
  return Object.fromEntries(
    Object.keys(PLATFORM_MATCHERS).map((platform) => [
      platform,
      assets.find((asset) => assetMatchesPlatform(asset.name, platform)) ?? null,
    ])
  );
}

function assetMatchesPlatform(name, platform) {
  const [nameMatcher, extensionMatcher] = PLATFORM_MATCHERS[platform];
  return extensionMatcher.test(name) && (nameMatcher.test(name) || platformFromExtension(name) === platform);
}

function platformFromExtension(name) {
  if (/\.(dmg|zip)$/i.test(name)) {
    return "macos";
  }
  if (/\.(exe|msi)$/i.test(name)) {
    return "windows";
  }
  if (/\.(appimage|deb|rpm)$/i.test(name)) {
    return "linux";
  }
  return null;
}

function renderPlatformCards(assetsByPlatform) {
  Object.entries(assetsByPlatform).forEach(([platform, asset]) => {
    const card = document.querySelector(`[data-platform-card="${platform}"]`);
    const link = card?.querySelector("a");
    if (!card || !link || !asset) {
      return;
    }
    card.dataset.available = "true";
    link.href = asset.browser_download_url;
    link.textContent = "Download";
  });
}

function renderPrimaryDownload(platform, assetsByPlatform, releaseUrl) {
  const asset = platform ? assetsByPlatform[platform] : null;
  if (!asset) {
    statusElement.textContent = platform
      ? `No ${PLATFORM_LABELS[platform]} installer is attached to the latest release yet.`
      : "Choose your installer from the latest release.";
    primaryDownload.textContent = "Open latest release";
    primaryDownload.href = releaseUrl || RELEASES_URL;
    primaryDownload.classList.remove("disabled");
    primaryDownload.removeAttribute("aria-disabled");
    return;
  }

  statusElement.textContent = `Latest ${PLATFORM_LABELS[platform]} installer found.`;
  primaryDownload.textContent = `Download for ${PLATFORM_LABELS[platform]}`;
  primaryDownload.href = asset.browser_download_url;
  primaryDownload.classList.remove("disabled");
  primaryDownload.removeAttribute("aria-disabled");
}

function renderReleaseFallback(error) {
  statusElement.textContent = `No release download is available yet. ${error.message}`;
  primaryDownload.textContent = "Open GitHub releases";
  primaryDownload.href = RELEASES_URL;
  primaryDownload.classList.remove("disabled");
  primaryDownload.removeAttribute("aria-disabled");
}
