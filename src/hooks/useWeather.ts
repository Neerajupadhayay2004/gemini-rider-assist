import { useState, useCallback } from 'react';

interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  description: string;
  isRaining: boolean;
  isFoggy: boolean;
  isStormy: boolean;
  isSlippery: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  warnings: string[];
}

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeWeatherRisk = (data: any): WeatherData => {
    const temp = data.main?.temp ?? 25;
    const humidity = data.main?.humidity ?? 50;
    const windSpeed = data.wind?.speed ?? 0;
    const visibility = data.visibility ?? 10000;
    const weatherId = data.weather?.[0]?.id ?? 800;
    const description = data.weather?.[0]?.description ?? 'clear';
    const icon = data.weather?.[0]?.icon ?? '01d';

    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'low';

    // Rain conditions (500-531)
    const isRaining = weatherId >= 500 && weatherId < 600;
    if (isRaining) {
      warnings.push('⚠️ Rain detected - roads may be slippery');
      riskLevel = 'medium';
    }

    // Fog/Mist (701-762)
    const isFoggy = weatherId >= 701 && weatherId <= 762;
    if (isFoggy) {
      warnings.push('🌫️ Low visibility - reduce speed');
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
    }

    // Storm conditions (200-232)
    const isStormy = weatherId >= 200 && weatherId < 300;
    if (isStormy) {
      warnings.push('⛈️ Thunderstorm warning - seek shelter');
      riskLevel = 'extreme';
    }

    // Snow/Ice (600-622)
    const isSlippery = weatherId >= 600 && weatherId < 700;
    if (isSlippery) {
      warnings.push('❄️ Snow/Ice conditions - extreme caution required');
      riskLevel = 'extreme';
    }

    // High winds
    if (windSpeed > 10) {
      warnings.push(`💨 Strong winds (${(windSpeed * 3.6).toFixed(1)} km/h) - maintain stability`);
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
    }

    // Low visibility
    if (visibility < 1000) {
      warnings.push('👁️ Very low visibility - avoid riding if possible');
      riskLevel = 'high';
    }

    // Extreme temperatures
    if (temp > 40) {
      warnings.push('🌡️ Extreme heat - stay hydrated');
    }
    if (temp < 0) {
      warnings.push('🥶 Freezing conditions - road may be icy');
      riskLevel = 'high';
    }

    // Humidity affecting grip
    if (humidity > 85 && !isRaining) {
      warnings.push('💧 High humidity - roads may be damp');
    }

    // Get condition name
    const getCondition = (id: number): string => {
      if (id >= 200 && id < 300) return 'Thunderstorm';
      if (id >= 300 && id < 400) return 'Drizzle';
      if (id >= 500 && id < 600) return 'Rain';
      if (id >= 600 && id < 700) return 'Snow';
      if (id >= 700 && id < 800) return 'Fog';
      if (id === 800) return 'Clear';
      if (id > 800) return 'Cloudy';
      return 'Unknown';
    };

    return {
      temperature: temp,
      condition: getCondition(weatherId),
      icon,
      humidity,
      windSpeed: windSpeed * 3.6, // Convert to km/h
      visibility: visibility / 1000, // Convert to km
      description,
      isRaining,
      isFoggy,
      isStormy,
      isSlippery,
      riskLevel,
      warnings,
    };
  };

  const fetchWeather = useCallback(async (latitude: number, longitude: number) => {
    setLoading(true);
    setError(null);

    try {
      // Using Open-Meteo API (free, no API key required)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,visibility&timezone=auto`
      );

      if (!response.ok) {
        throw new Error('Weather service unavailable');
      }

      const data = await response.json();
      
      // Map Open-Meteo response to our format
      const weatherCode = data.current?.weather_code ?? 0;
      const mappedData = {
        main: {
          temp: data.current?.temperature_2m ?? 25,
          humidity: data.current?.relative_humidity_2m ?? 50,
        },
        wind: {
          speed: (data.current?.wind_speed_10m ?? 0) / 3.6, // Convert km/h to m/s for our analyzer
        },
        visibility: (data.current?.visibility ?? 10) * 1000, // Convert km to meters
        weather: [{
          id: mapWeatherCodeToId(weatherCode),
          description: getWeatherDescription(weatherCode),
          icon: getWeatherIcon(weatherCode),
        }],
      };

      setWeather(analyzeWeatherRisk(mappedData));
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  }, []);

  return { weather, loading, error, fetchWeather };
};

// Map Open-Meteo weather codes to OpenWeatherMap-like IDs for our analyzer
function mapWeatherCodeToId(code: number): number {
  if (code === 0) return 800; // Clear
  if (code === 1 || code === 2 || code === 3) return 801; // Cloudy
  if (code >= 45 && code <= 48) return 741; // Fog
  if (code >= 51 && code <= 67) return 500; // Rain/Drizzle
  if (code >= 71 && code <= 77) return 600; // Snow
  if (code >= 80 && code <= 82) return 520; // Showers
  if (code >= 85 && code <= 86) return 620; // Snow showers
  if (code >= 95) return 200; // Thunderstorm
  return 800;
}

function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'clear sky',
    1: 'mainly clear',
    2: 'partly cloudy',
    3: 'overcast',
    45: 'fog',
    48: 'depositing rime fog',
    51: 'light drizzle',
    53: 'moderate drizzle',
    55: 'dense drizzle',
    61: 'slight rain',
    63: 'moderate rain',
    65: 'heavy rain',
    71: 'slight snow',
    73: 'moderate snow',
    75: 'heavy snow',
    80: 'light showers',
    81: 'moderate showers',
    82: 'heavy showers',
    95: 'thunderstorm',
  };
  return descriptions[code] ?? 'unknown';
}

function getWeatherIcon(code: number): string {
  if (code === 0) return '01d';
  if (code <= 3) return '02d';
  if (code <= 48) return '50d';
  if (code <= 67) return '10d';
  if (code <= 77) return '13d';
  if (code <= 82) return '09d';
  if (code >= 95) return '11d';
  return '01d';
}
