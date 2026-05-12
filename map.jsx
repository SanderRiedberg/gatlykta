/* global React, window, createGatlyktaMap, createScratchOverlay, removeScratchOverlay, renderStreetLayers, updateStreetLayerStyles, attachScratchOverlay, renderStreetLabels, renderDistrictLabels, focusGatlyktaMap, attachGatlyktaResizeHandling, applyGatlyktaMapStyle */
// Gatlykta — React wrapper for the Leaflet map.

const { useEffect: useEm, useRef: useRm } = React;

// Leaflet panes z-index plan:
//   tilePane (default 200) — base satellite tiles
//   "paperPane" (350)      — paper overlay covering map
//   overlayPane (400)      — street polylines
//   "labelPane" (650)      — street and district labels

function LeafletMap({
  streets,
  activeDistricts = null,
  focusDistrict = null,
  streetStates = {},
  onStreetClick,
  onStreetHover,
  showLabels = true,
  showSolvedLabels = true,
  showStreetLabels = false,
  interactive = true,
  hoveredStreet = null,
  scratch = true,
  mapStyle = 'sketch',
  progress = 0,
}) {
  const containerRef = useRm(null);
  const mapRef = useRm(null);
  const polylinesRef = useRm({});
  const hitAreasRef = useRm({});
  const paperOverlayRef = useRm(null);
  const labelLayerRef = useRm(null);

  useEm(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = createGatlyktaMap(containerRef.current);
    mapRef.current = map;
    return () => {
      try { map.remove(); } catch {}
      mapRef.current = null;
    };
  }, []);

  useEm(() => {
    const map = mapRef.current;
    if (!map) return;
    if (paperOverlayRef.current) {
      removeScratchOverlay(paperOverlayRef.current);
      paperOverlayRef.current = null;
    }
    if (!scratch) return;
    paperOverlayRef.current = createScratchOverlay(map, containerRef.current);
    return () => {
      removeScratchOverlay(paperOverlayRef.current);
      paperOverlayRef.current = null;
    };
  }, [scratch]);

  useEm(() => {
    renderStreetLayers({
      map: mapRef.current,
      streets,
      activeDistricts,
      interactive,
      onStreetClick,
      onStreetHover,
      polylinesRef,
      hitAreasRef,
    });
  }, [streets, activeDistricts, interactive]);

  useEm(() => {
    updateStreetLayerStyles(polylinesRef, streetStates);
  }, [streetStates, streets]);

  useEm(() => {
    if (!scratch || !paperOverlayRef.current || !mapRef.current) return;
    return attachScratchOverlay({
      map: mapRef.current,
      canvas: paperOverlayRef.current,
      streets,
      activeDistricts,
      streetStates,
      mapStyle,
      progress,
    });
  }, [scratch, streetStates, streets, activeDistricts, mapStyle, progress]);

  useEm(() => {
    renderStreetLabels({
      map: mapRef.current,
      layerRef: labelLayerRef,
      streets,
      activeDistricts,
      streetStates,
      hoveredStreet,
      showSolvedLabels,
      showStreetLabels,
    });
  }, [streets, streetStates, hoveredStreet, showSolvedLabels, showStreetLabels, activeDistricts]);

  useEm(() => {
    return renderDistrictLabels({
      map: mapRef.current,
      showLabels,
      activeDistricts,
    });
  }, [showLabels, activeDistricts]);

  useEm(() => {
    focusGatlyktaMap(mapRef.current, focusDistrict);
  }, [focusDistrict]);

  useEm(() => {
    return attachGatlyktaResizeHandling(mapRef.current, containerRef.current);
  }, []);

  useEm(() => {
    applyGatlyktaMapStyle(containerRef.current, mapStyle, progress);
  }, [mapStyle, progress]);

  return (
    <div ref={containerRef} className="leaflet-host" style={{ width: '100%', height: '100%', background: 'var(--bg-2)' }} />
  );
}

window.LeafletMap = LeafletMap;
