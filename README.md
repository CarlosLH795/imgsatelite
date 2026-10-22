# Visor NOAA GOES-19 + pronósticos GFS para México

## Iniciar

```bash
npm install
npm start
```

Abrir http://127.0.0.1:4200

## Funciones

- Satélite GOES-19 GeoColor (imagen oficial NOAA).
- Pronóstico GFS de precipitación acumulada en ventanas de 3 horas.
- Pronóstico GFS de temperatura a 2 metros cada 3 horas.
- Animación, selección de intervalos y controles de avance.
- Fronteras y costas geográficas vectoriales de Basemap/GSHHS incluidas localmente.
- Campo de color interpolado por distancia inversa entre 63 puntos consultados en Open-Meteo.

## Limitaciones

La superficie de color es una **interpolación visual** de 63 puntos, no una salida raster nativa de GFS; no debe interpretarse como pronóstico de alta resolución. Las consultas requieren conexión a Internet y acceso a Open-Meteo. Las ventanas de precipitación están expresadas en UTC. Los datos son pronósticos, no observaciones.
