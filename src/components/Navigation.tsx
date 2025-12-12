import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Navigation as NavIcon, 
  MapPin, 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw,
  AlertTriangle,
  Leaf,
  Clock,
  Route,
  Volume2,
  VolumeX,
  Play,
  Square,
  Target,
  Locate,
  Navigation2,
  Globe
} from 'lucide-react';
import { useVibration } from '@/hooks/useVibration';
import { toast } from 'sonner';

interface NavigationProps {
  locationData?: {
    latitude: number;
    longitude: number;
    speed: number | null;
  };
  onRideStart?: () => void;
  onRideStop?: () => void;
}

interface NavigationStep {
  id: number;
  direction: 'straight' | 'left' | 'right' | 'uturn' | 'destination';
  distance: number;
  hazardKey?: string;
  ecoTipKey?: string;
  lat: number;
  lng: number;
}

interface RouteInfo {
  totalDistance: number;
  ecoScore: number;
  hazards: number;
  steps: NavigationStep[];
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
}

// Multi-language translations
const translations: Record<string, Record<string, string>> = {
  'hi-IN': {
    // Directions
    straight: 'सीधे जाएं',
    left: 'बाएं मुड़ें',
    right: 'दाएं मुड़ें',
    uturn: 'यू-टर्न लें',
    destination: 'आप अपनी मंज़िल पर पहुंच गए!',
    towards: 'की तरफ',
    // Distance
    meters: 'मीटर',
    km: 'किलोमीटर',
    in: 'में',
    // Hazards
    busyIntersection: 'व्यस्त चौराहा - सावधान रहें',
    schoolZone: 'स्कूल ज़ोन - धीमी गति',
    sharpTurn: 'तेज़ मोड़ - धीमे चलें',
    // Eco tips
    steadySpeed: 'स्थिर गति बनाए रखें - ईंधन बचाएं',
    engineBraking: 'इंजन ब्रेकिंग का उपयोग करें',
    ecoMode: 'इको मोड सक्रिय रखें',
    // UI
    enterDestination: 'मंज़िल दर्ज करें',
    startRide: 'राइड शुरू',
    stop: 'रुकें',
    repeat: 'दोहराएं',
    currentLocation: 'वर्तमान स्थिति',
    live: 'लाइव',
    searchingGPS: 'GPS सिग्नल ढूंढ रहे हैं...',
    distance: 'दूरी',
    time: 'समय',
    eco: 'इको',
    hazardsLabel: 'खतरे',
    now: 'अभी',
    step: 'चरण',
    of: 'का',
    distanceTraveled: 'तय की गई दूरी',
    currentSpeed: 'वर्तमान गति',
    navigationStarted: 'नेविगेशन शुरू',
    navigationStopped: 'नेविगेशन बंद',
    pleaseEnterDest: 'कृपया मंज़िल दर्ज करें',
    waitForGPS: 'GPS सिग्नल की प्रतीक्षा करें',
    congratulations: 'बधाई हो!',
    warning: 'चेतावनी',
    ecoTip: 'इको टिप',
    getReady: 'तैयार रहें!',
    totalDistance: 'कुल दूरी',
    estimatedTime: 'अनुमानित समय',
    minutes: 'मिनट',
    home: 'घर',
    office: 'ऑफिस',
    petrolPump: 'पेट्रोल पंप',
    hospital: 'अस्पताल',
    market: 'बाज़ार'
  },
  'en-US': {
    straight: 'Go straight',
    left: 'Turn left',
    right: 'Turn right',
    uturn: 'Take U-turn',
    destination: 'You have reached your destination!',
    towards: 'towards',
    meters: 'meters',
    km: 'kilometers',
    in: 'in',
    busyIntersection: 'Busy intersection - Be careful',
    schoolZone: 'School zone - Slow down',
    sharpTurn: 'Sharp turn - Reduce speed',
    steadySpeed: 'Maintain steady speed - Save fuel',
    engineBraking: 'Use engine braking',
    ecoMode: 'Keep eco mode active',
    enterDestination: 'Enter destination',
    startRide: 'Start Ride',
    stop: 'Stop',
    repeat: 'Repeat',
    currentLocation: 'Current Location',
    live: 'LIVE',
    searchingGPS: 'Searching for GPS signal...',
    distance: 'Distance',
    time: 'Time',
    eco: 'Eco',
    hazardsLabel: 'Hazards',
    now: 'Now',
    step: 'Step',
    of: 'of',
    distanceTraveled: 'Distance Traveled',
    currentSpeed: 'Current Speed',
    navigationStarted: 'Navigation started',
    navigationStopped: 'Navigation stopped',
    pleaseEnterDest: 'Please enter destination',
    waitForGPS: 'Waiting for GPS signal',
    congratulations: 'Congratulations!',
    warning: 'Warning',
    ecoTip: 'Eco Tip',
    getReady: 'Get ready!',
    totalDistance: 'Total Distance',
    estimatedTime: 'Estimated Time',
    minutes: 'minutes',
    home: 'Home',
    office: 'Office',
    petrolPump: 'Petrol Pump',
    hospital: 'Hospital',
    market: 'Market'
  },
  'es-ES': {
    straight: 'Siga recto',
    left: 'Gire a la izquierda',
    right: 'Gire a la derecha',
    uturn: 'Haga un giro en U',
    destination: '¡Ha llegado a su destino!',
    towards: 'hacia',
    meters: 'metros',
    km: 'kilómetros',
    in: 'en',
    busyIntersection: 'Intersección concurrida - Tenga cuidado',
    schoolZone: 'Zona escolar - Reduzca velocidad',
    sharpTurn: 'Curva cerrada - Reduzca velocidad',
    steadySpeed: 'Mantenga velocidad constante - Ahorre combustible',
    engineBraking: 'Use freno motor',
    ecoMode: 'Mantenga modo eco activo',
    enterDestination: 'Ingrese destino',
    startRide: 'Iniciar',
    stop: 'Parar',
    repeat: 'Repetir',
    currentLocation: 'Ubicación actual',
    live: 'EN VIVO',
    searchingGPS: 'Buscando señal GPS...',
    distance: 'Distancia',
    time: 'Tiempo',
    eco: 'Eco',
    hazardsLabel: 'Peligros',
    now: 'Ahora',
    step: 'Paso',
    of: 'de',
    distanceTraveled: 'Distancia recorrida',
    currentSpeed: 'Velocidad actual',
    navigationStarted: 'Navegación iniciada',
    navigationStopped: 'Navegación detenida',
    pleaseEnterDest: 'Por favor ingrese destino',
    waitForGPS: 'Esperando señal GPS',
    congratulations: '¡Felicidades!',
    warning: 'Advertencia',
    ecoTip: 'Consejo Eco',
    getReady: '¡Prepárese!',
    totalDistance: 'Distancia total',
    estimatedTime: 'Tiempo estimado',
    minutes: 'minutos',
    home: 'Casa',
    office: 'Oficina',
    petrolPump: 'Gasolinera',
    hospital: 'Hospital',
    market: 'Mercado'
  },
  'fr-FR': {
    straight: 'Continuez tout droit',
    left: 'Tournez à gauche',
    right: 'Tournez à droite',
    uturn: 'Faites demi-tour',
    destination: 'Vous êtes arrivé à destination!',
    towards: 'vers',
    meters: 'mètres',
    km: 'kilomètres',
    in: 'dans',
    busyIntersection: 'Carrefour fréquenté - Soyez prudent',
    schoolZone: 'Zone scolaire - Ralentissez',
    sharpTurn: 'Virage serré - Réduisez la vitesse',
    steadySpeed: 'Maintenez une vitesse stable - Économisez du carburant',
    engineBraking: 'Utilisez le frein moteur',
    ecoMode: 'Gardez le mode éco actif',
    enterDestination: 'Entrez la destination',
    startRide: 'Démarrer',
    stop: 'Arrêter',
    repeat: 'Répéter',
    currentLocation: 'Position actuelle',
    live: 'EN DIRECT',
    searchingGPS: 'Recherche du signal GPS...',
    distance: 'Distance',
    time: 'Temps',
    eco: 'Éco',
    hazardsLabel: 'Dangers',
    now: 'Maintenant',
    step: 'Étape',
    of: 'sur',
    distanceTraveled: 'Distance parcourue',
    currentSpeed: 'Vitesse actuelle',
    navigationStarted: 'Navigation démarrée',
    navigationStopped: 'Navigation arrêtée',
    pleaseEnterDest: 'Veuillez entrer la destination',
    waitForGPS: 'En attente du signal GPS',
    congratulations: 'Félicitations!',
    warning: 'Attention',
    ecoTip: 'Conseil Éco',
    getReady: 'Préparez-vous!',
    totalDistance: 'Distance totale',
    estimatedTime: 'Temps estimé',
    minutes: 'minutes',
    home: 'Maison',
    office: 'Bureau',
    petrolPump: 'Station-service',
    hospital: 'Hôpital',
    market: 'Marché'
  },
  'de-DE': {
    straight: 'Geradeaus fahren',
    left: 'Links abbiegen',
    right: 'Rechts abbiegen',
    uturn: 'Wenden',
    destination: 'Sie haben Ihr Ziel erreicht!',
    towards: 'Richtung',
    meters: 'Meter',
    km: 'Kilometer',
    in: 'in',
    busyIntersection: 'Belebte Kreuzung - Vorsicht',
    schoolZone: 'Schulzone - Langsam fahren',
    sharpTurn: 'Scharfe Kurve - Geschwindigkeit reduzieren',
    steadySpeed: 'Gleichmäßige Geschwindigkeit - Kraftstoff sparen',
    engineBraking: 'Motorbremse verwenden',
    ecoMode: 'Eco-Modus aktiv halten',
    enterDestination: 'Ziel eingeben',
    startRide: 'Starten',
    stop: 'Stopp',
    repeat: 'Wiederholen',
    currentLocation: 'Aktueller Standort',
    live: 'LIVE',
    searchingGPS: 'GPS-Signal wird gesucht...',
    distance: 'Entfernung',
    time: 'Zeit',
    eco: 'Öko',
    hazardsLabel: 'Gefahren',
    now: 'Jetzt',
    step: 'Schritt',
    of: 'von',
    distanceTraveled: 'Zurückgelegte Strecke',
    currentSpeed: 'Aktuelle Geschwindigkeit',
    navigationStarted: 'Navigation gestartet',
    navigationStopped: 'Navigation beendet',
    pleaseEnterDest: 'Bitte Ziel eingeben',
    waitForGPS: 'Warten auf GPS-Signal',
    congratulations: 'Herzlichen Glückwunsch!',
    warning: 'Warnung',
    ecoTip: 'Öko-Tipp',
    getReady: 'Machen Sie sich bereit!',
    totalDistance: 'Gesamtdistanz',
    estimatedTime: 'Geschätzte Zeit',
    minutes: 'Minuten',
    home: 'Zuhause',
    office: 'Büro',
    petrolPump: 'Tankstelle',
    hospital: 'Krankenhaus',
    market: 'Markt'
  },
  'pt-BR': {
    straight: 'Siga em frente',
    left: 'Vire à esquerda',
    right: 'Vire à direita',
    uturn: 'Faça retorno',
    destination: 'Você chegou ao seu destino!',
    towards: 'em direção a',
    meters: 'metros',
    km: 'quilômetros',
    in: 'em',
    busyIntersection: 'Cruzamento movimentado - Cuidado',
    schoolZone: 'Zona escolar - Reduza a velocidade',
    sharpTurn: 'Curva fechada - Reduza a velocidade',
    steadySpeed: 'Mantenha velocidade constante - Economize combustível',
    engineBraking: 'Use freio motor',
    ecoMode: 'Mantenha modo eco ativo',
    enterDestination: 'Digite o destino',
    startRide: 'Iniciar',
    stop: 'Parar',
    repeat: 'Repetir',
    currentLocation: 'Localização atual',
    live: 'AO VIVO',
    searchingGPS: 'Procurando sinal GPS...',
    distance: 'Distância',
    time: 'Tempo',
    eco: 'Eco',
    hazardsLabel: 'Perigos',
    now: 'Agora',
    step: 'Passo',
    of: 'de',
    distanceTraveled: 'Distância percorrida',
    currentSpeed: 'Velocidade atual',
    navigationStarted: 'Navegação iniciada',
    navigationStopped: 'Navegação parada',
    pleaseEnterDest: 'Por favor digite o destino',
    waitForGPS: 'Aguardando sinal GPS',
    congratulations: 'Parabéns!',
    warning: 'Aviso',
    ecoTip: 'Dica Eco',
    getReady: 'Prepare-se!',
    totalDistance: 'Distância total',
    estimatedTime: 'Tempo estimado',
    minutes: 'minutos',
    home: 'Casa',
    office: 'Escritório',
    petrolPump: 'Posto de gasolina',
    hospital: 'Hospital',
    market: 'Mercado'
  },
  'ja-JP': {
    straight: 'まっすぐ進んでください',
    left: '左折してください',
    right: '右折してください',
    uturn: 'Uターンしてください',
    destination: '目的地に到着しました！',
    towards: '方向へ',
    meters: 'メートル',
    km: 'キロメートル',
    in: '後',
    busyIntersection: '混雑した交差点 - ご注意ください',
    schoolZone: 'スクールゾーン - 減速してください',
    sharpTurn: '急カーブ - 速度を落としてください',
    steadySpeed: '一定速度を維持 - 燃料を節約',
    engineBraking: 'エンジンブレーキを使用',
    ecoMode: 'エコモードを維持',
    enterDestination: '目的地を入力',
    startRide: 'スタート',
    stop: '停止',
    repeat: '繰り返す',
    currentLocation: '現在地',
    live: 'ライブ',
    searchingGPS: 'GPS信号を検索中...',
    distance: '距離',
    time: '時間',
    eco: 'エコ',
    hazardsLabel: '危険',
    now: '現在',
    step: 'ステップ',
    of: '/',
    distanceTraveled: '移動距離',
    currentSpeed: '現在の速度',
    navigationStarted: 'ナビゲーション開始',
    navigationStopped: 'ナビゲーション停止',
    pleaseEnterDest: '目的地を入力してください',
    waitForGPS: 'GPS信号を待っています',
    congratulations: 'おめでとうございます！',
    warning: '警告',
    ecoTip: 'エコヒント',
    getReady: '準備してください！',
    totalDistance: '総距離',
    estimatedTime: '推定時間',
    minutes: '分',
    home: '自宅',
    office: 'オフィス',
    petrolPump: 'ガソリンスタンド',
    hospital: '病院',
    market: '市場'
  },
  'zh-CN': {
    straight: '直行',
    left: '左转',
    right: '右转',
    uturn: '掉头',
    destination: '您已到达目的地！',
    towards: '朝向',
    meters: '米',
    km: '公里',
    in: '后',
    busyIntersection: '繁忙路口 - 请小心',
    schoolZone: '学校区域 - 请减速',
    sharpTurn: '急转弯 - 请减速',
    steadySpeed: '保持稳定速度 - 节省燃料',
    engineBraking: '使用发动机制动',
    ecoMode: '保持环保模式',
    enterDestination: '输入目的地',
    startRide: '开始',
    stop: '停止',
    repeat: '重复',
    currentLocation: '当前位置',
    live: '实时',
    searchingGPS: '正在搜索GPS信号...',
    distance: '距离',
    time: '时间',
    eco: '环保',
    hazardsLabel: '危险',
    now: '现在',
    step: '步骤',
    of: '/',
    distanceTraveled: '已行驶距离',
    currentSpeed: '当前速度',
    navigationStarted: '导航已开始',
    navigationStopped: '导航已停止',
    pleaseEnterDest: '请输入目的地',
    waitForGPS: '等待GPS信号',
    congratulations: '恭喜！',
    warning: '警告',
    ecoTip: '环保提示',
    getReady: '准备好！',
    totalDistance: '总距离',
    estimatedTime: '预计时间',
    minutes: '分钟',
    home: '家',
    office: '办公室',
    petrolPump: '加油站',
    hospital: '医院',
    market: '市场'
  },
  'ar-SA': {
    straight: 'استمر في الطريق',
    left: 'انعطف يسارًا',
    right: 'انعطف يمينًا',
    uturn: 'استدر للخلف',
    destination: 'لقد وصلت إلى وجهتك!',
    towards: 'باتجاه',
    meters: 'متر',
    km: 'كيلومتر',
    in: 'في',
    busyIntersection: 'تقاطع مزدحم - كن حذرًا',
    schoolZone: 'منطقة مدرسة - أبطئ السرعة',
    sharpTurn: 'منعطف حاد - خفف السرعة',
    steadySpeed: 'حافظ على سرعة ثابتة - وفر الوقود',
    engineBraking: 'استخدم فرملة المحرك',
    ecoMode: 'أبق وضع الاقتصاد نشطًا',
    enterDestination: 'أدخل الوجهة',
    startRide: 'ابدأ',
    stop: 'توقف',
    repeat: 'كرر',
    currentLocation: 'الموقع الحالي',
    live: 'مباشر',
    searchingGPS: 'جاري البحث عن إشارة GPS...',
    distance: 'المسافة',
    time: 'الوقت',
    eco: 'اقتصادي',
    hazardsLabel: 'مخاطر',
    now: 'الآن',
    step: 'خطوة',
    of: 'من',
    distanceTraveled: 'المسافة المقطوعة',
    currentSpeed: 'السرعة الحالية',
    navigationStarted: 'بدأ التنقل',
    navigationStopped: 'توقف التنقل',
    pleaseEnterDest: 'الرجاء إدخال الوجهة',
    waitForGPS: 'في انتظار إشارة GPS',
    congratulations: 'تهانينا!',
    warning: 'تحذير',
    ecoTip: 'نصيحة اقتصادية',
    getReady: 'استعد!',
    totalDistance: 'المسافة الكلية',
    estimatedTime: 'الوقت المقدر',
    minutes: 'دقائق',
    home: 'المنزل',
    office: 'المكتب',
    petrolPump: 'محطة وقود',
    hospital: 'مستشفى',
    market: 'سوق'
  }
};

const languages = [
  { code: 'hi-IN', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'ar-SA', name: 'العربية', flag: '🇸🇦' },
];

const Navigation = ({ locationData, onRideStart, onRideStop }: NavigationProps) => {
  const [destination, setDestination] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [language, setLanguage] = useState('hi-IN');
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [distanceToNextStep, setDistanceToNextStep] = useState<number | null>(null);
  const [totalDistanceTraveled, setTotalDistanceTraveled] = useState(0);
  const [startLocation, setStartLocation] = useState<{ lat: number; lng: number } | null>(null);
  const lastSpokenStepRef = useRef<number>(-1);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const voiceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { patterns } = useVibration();

  const t = useCallback((key: string): string => {
    return translations[language]?.[key] || translations['en-US'][key] || key;
  }, [language]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const generateRoute = useCallback((dest: string, currentLat: number, currentLng: number): RouteInfo => {
    const stepDistance = 0.002;
    const steps: NavigationStep[] = [
      {
        id: 1,
        direction: 'straight',
        distance: 500,
        ecoTipKey: 'steadySpeed',
        lat: currentLat + stepDistance,
        lng: currentLng
      },
      {
        id: 2,
        direction: 'left',
        distance: 200,
        hazardKey: 'busyIntersection',
        lat: currentLat + stepDistance,
        lng: currentLng - stepDistance
      },
      {
        id: 3,
        direction: 'straight',
        distance: 1000,
        ecoTipKey: 'engineBraking',
        lat: currentLat + stepDistance * 3,
        lng: currentLng - stepDistance
      },
      {
        id: 4,
        direction: 'right',
        distance: 300,
        hazardKey: 'schoolZone',
        lat: currentLat + stepDistance * 3,
        lng: currentLng
      },
      {
        id: 5,
        direction: 'destination',
        distance: 0,
        lat: currentLat + stepDistance * 4,
        lng: currentLng + stepDistance
      }
    ];

    return {
      totalDistance: 2000,
      ecoScore: 85,
      hazards: 2,
      steps,
      startLocation: { lat: currentLat, lng: currentLng },
      endLocation: { lat: steps[steps.length - 1].lat, lng: steps[steps.length - 1].lng }
    };
  }, []);

  const getInstructionText = useCallback((step: NavigationStep, dest: string): string => {
    if (step.direction === 'destination') {
      return `${dest} - ${t('destination')}`;
    }
    return `${t(step.direction)} ${t('towards')} ${dest}`;
  }, [t]);

  const formatDistanceText = useCallback((meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} ${t('km')}`;
    }
    return `${Math.round(meters)} ${t('meters')}`;
  }, [t]);

  const speakInstruction = useCallback((text: string, force: boolean = false) => {
    if (!voiceEnabled && !force) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const langCode = language.split('-')[0];
    const matchingVoice = voices.find(v => v.lang.includes(langCode));
    if (matchingVoice) utterance.voice = matchingVoice;
    
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled, language]);

  const startNavigation = () => {
    if (!destination.trim()) {
      toast.error(t('pleaseEnterDest'));
      speakInstruction(t('pleaseEnterDest'), true);
      return;
    }

    if (!locationData) {
      toast.error(t('waitForGPS'));
      speakInstruction(t('waitForGPS'), true);
      return;
    }

    const route = generateRoute(destination, locationData.latitude, locationData.longitude);
    setRouteInfo(route);
    setIsNavigating(true);
    setCurrentStep(0);
    setTotalDistanceTraveled(0);
    setStartLocation({ lat: locationData.latitude, lng: locationData.longitude });
    lastSpokenStepRef.current = -1;
    lastLocationRef.current = { lat: locationData.latitude, lng: locationData.longitude };
    
    const startMsg = `${t('navigationStarted')}. ${t('totalDistance')} ${formatDistanceText(route.totalDistance)}, ${t('estimatedTime')} 8 ${t('minutes')}. ${getInstructionText(route.steps[0], destination)}`;
    speakInstruction(startMsg, true);
    patterns.tap();
    toast.success(t('navigationStarted'));
    
    onRideStart?.();
    startVoiceUpdates();
  };

  const startVoiceUpdates = () => {
    if (voiceIntervalRef.current) {
      clearInterval(voiceIntervalRef.current);
    }

    voiceIntervalRef.current = setInterval(() => {
      if (!isNavigating || !locationData || !routeInfo) return;

      const speed = locationData.speed ? Math.round(locationData.speed * 3.6) : 0;
      const currentStepData = routeInfo.steps[currentStep];
      
      if (currentStepData && distanceToNextStep !== null) {
        if (distanceToNextStep > 100) {
          const statusMsg = `${t('in')} ${formatDistanceText(distanceToNextStep)}, ${getInstructionText(currentStepData, destination)}. ${t('currentSpeed')} ${speed} km/h.`;
          speakInstruction(statusMsg);
        } else if (distanceToNextStep <= 100 && distanceToNextStep > 30) {
          speakInstruction(`${t('in')} ${formatDistanceText(distanceToNextStep)}, ${getInstructionText(currentStepData, destination)}. ${t('getReady')}`);
          patterns.warning();
        }
      }
    }, 10000);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setRouteInfo(null);
    setCurrentStep(0);
    setDistanceToNextStep(null);
    setTotalDistanceTraveled(0);
    window.speechSynthesis.cancel();
    
    if (voiceIntervalRef.current) {
      clearInterval(voiceIntervalRef.current);
      voiceIntervalRef.current = null;
    }
    
    toast.info(t('navigationStopped'));
    speakInstruction(t('navigationStopped'), true);
    onRideStop?.();
  };

  useEffect(() => {
    if (!isNavigating || !locationData || !routeInfo) return;

    const currentStepData = routeInfo.steps[currentStep];
    if (!currentStepData) return;

    const distance = calculateDistance(
      locationData.latitude,
      locationData.longitude,
      currentStepData.lat,
      currentStepData.lng
    );
    setDistanceToNextStep(distance);

    if (lastLocationRef.current) {
      const traveled = calculateDistance(
        lastLocationRef.current.lat,
        lastLocationRef.current.lng,
        locationData.latitude,
        locationData.longitude
      );
      if (traveled > 1) {
        setTotalDistanceTraveled(prev => prev + traveled);
        lastLocationRef.current = { lat: locationData.latitude, lng: locationData.longitude };
      }
    }

    if (distance < 30 && currentStep < routeInfo.steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      const nextStepData = routeInfo.steps[nextStep];
      
      if (lastSpokenStepRef.current !== nextStep) {
        lastSpokenStepRef.current = nextStep;
        
        let announcement = getInstructionText(nextStepData, destination);
        
        if (nextStepData.hazardKey) {
          patterns.warning();
          announcement += `. ${t('warning')}: ${t(nextStepData.hazardKey)}`;
        }
        
        if (nextStepData.ecoTipKey) {
          announcement += `. ${t('ecoTip')}: ${t(nextStepData.ecoTipKey)}`;
        }
        
        speakInstruction(announcement, true);
        patterns.tap();
      }
    }

    if (currentStep === routeInfo.steps.length - 1 && distance < 30) {
      speakInstruction(`${t('congratulations')} ${t('destination')}`, true);
      patterns.success();
      stopNavigation();
    }

  }, [locationData, isNavigating, routeInfo, currentStep]);

  useEffect(() => {
    return () => {
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
      }
    };
  }, []);

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'left': return <ArrowLeft className="w-8 h-8" />;
      case 'right': return <ArrowRight className="w-8 h-8" />;
      case 'uturn': return <RotateCcw className="w-8 h-8" />;
      case 'destination': return <Target className="w-8 h-8" />;
      default: return <ArrowUp className="w-8 h-8" />;
    }
  };

  const quickDestinations = [
    { key: 'home', icon: '🏠' },
    { key: 'office', icon: '🏢' },
    { key: 'petrolPump', icon: '⛽' },
    { key: 'hospital', icon: '🏥' },
    { key: 'market', icon: '🛒' }
  ];

  return (
    <Card className="glass-card neon-border overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/20 to-accent/20">
        <CardTitle className="flex items-center gap-3 text-foreground">
          <NavIcon className="w-6 h-6 text-primary" />
          AI Navigation
          <div className="ml-auto flex items-center gap-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-background/50">
                <Globe className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary">
              <Leaf className="w-3 h-3 mr-1" />
              {t('eco')}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Current Location Display */}
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
          <Locate className="w-5 h-5 text-primary animate-pulse" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{t('currentLocation')} ({t('live')})</p>
            {locationData ? (
              <p className="text-sm font-mono text-foreground">
                {locationData.latitude.toFixed(6)}°N, {locationData.longitude.toFixed(6)}°E
              </p>
            ) : (
              <p className="text-sm text-warning animate-pulse">{t('searchingGPS')}</p>
            )}
          </div>
          {locationData?.speed && (
            <Badge className="bg-primary/20 text-primary">
              {Math.round(locationData.speed * 3.6)} km/h
            </Badge>
          )}
        </div>

        {/* Destination Input */}
        {!isNavigating && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={t('enterDestination')}
                  className="pl-10 bg-muted/50 border-border"
                />
              </div>
              <Button 
                onClick={startNavigation} 
                className="bg-primary text-primary-foreground hover:bg-primary/80"
                disabled={!locationData}
              >
                <Play className="w-4 h-4 mr-2" />
                {t('startRide')}
              </Button>
            </div>
            
            {/* Quick destinations */}
            <div className="flex flex-wrap gap-2">
              {quickDestinations.map((place) => (
                <Button
                  key={place.key}
                  variant="outline"
                  size="sm"
                  onClick={() => setDestination(t(place.key))}
                  className="text-xs border-border hover:bg-muted"
                >
                  <span className="mr-1">{place.icon}</span>
                  {t(place.key)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Active Navigation */}
        {isNavigating && routeInfo && (
          <div className="space-y-4">
            {/* Live Distance to Next Step */}
            <div className="bg-gradient-to-br from-primary/30 to-accent/30 rounded-xl p-6 text-center relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <Badge className="bg-background/80 text-foreground animate-pulse">
                  <Navigation2 className="w-3 h-3 mr-1" />
                  {t('live')}
                </Badge>
              </div>
              
              <div className="flex justify-center mb-3">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary neon-border animate-pulse">
                  {getDirectionIcon(routeInfo.steps[currentStep].direction)}
                </div>
              </div>
              
              {distanceToNextStep !== null && (
                <p className="text-3xl font-black text-primary mb-2">
                  {formatDistanceText(distanceToNextStep)}
                </p>
              )}
              
              <p className="text-lg font-bold text-foreground mb-1">
                {getInstructionText(routeInfo.steps[currentStep], destination)}
              </p>
              
              <p className="text-sm text-muted-foreground">
                {t('step')} {currentStep + 1} {t('of')} {routeInfo.steps.length}
              </p>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-3 bg-muted/30 rounded-lg border border-primary/30">
                <p className="text-xs text-muted-foreground">{t('distanceTraveled')}</p>
                <p className="text-lg font-bold text-primary">{formatDistanceText(totalDistanceTraveled)}</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg border border-secondary/30">
                <p className="text-xs text-muted-foreground">{t('currentSpeed')}</p>
                <p className="text-lg font-bold text-secondary">
                  {locationData?.speed ? Math.round(locationData.speed * 3.6) : 0} km/h
                </p>
              </div>
            </div>

            {/* Hazard Warning */}
            {routeInfo.steps[currentStep].hazardKey && (
              <div className="flex items-center gap-3 p-3 bg-warning/20 rounded-lg border border-warning/50 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <span className="text-sm font-medium text-warning">
                  {t(routeInfo.steps[currentStep].hazardKey!)}
                </span>
              </div>
            )}

            {/* Eco Tip */}
            {routeInfo.steps[currentStep].ecoTipKey && (
              <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
                <Leaf className="w-5 h-5 text-primary" />
                <span className="text-sm text-primary">
                  {t(routeInfo.steps[currentStep].ecoTipKey!)}
                </span>
              </div>
            )}

            {/* Route Info */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <Route className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">{t('totalDistance')}</p>
                <p className="text-sm font-bold text-foreground">{formatDistanceText(routeInfo.totalDistance)}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <Clock className="w-4 h-4 mx-auto text-secondary mb-1" />
                <p className="text-xs text-muted-foreground">{t('time')}</p>
                <p className="text-sm font-bold text-foreground">8 {t('minutes')}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <Leaf className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">{t('eco')}</p>
                <p className="text-sm font-bold text-primary">{routeInfo.ecoScore}%</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 mx-auto text-warning mb-1" />
                <p className="text-xs text-muted-foreground">{t('hazardsLabel')}</p>
                <p className="text-sm font-bold text-warning">{routeInfo.hazards}</p>
              </div>
            </div>

            {/* Steps Preview */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {routeInfo.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    idx === currentStep 
                      ? 'bg-primary/20 border-2 border-primary/50 scale-[1.02]' 
                      : idx < currentStep 
                        ? 'opacity-50 bg-muted/10' 
                        : 'bg-muted/20'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    idx === currentStep ? 'bg-primary text-primary-foreground animate-pulse' : 
                    idx < currentStep ? 'bg-muted text-muted-foreground' : 'bg-muted/50'
                  }`}>
                    {getDirectionIcon(step.direction)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-foreground line-clamp-1">{getInstructionText(step, destination)}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceText(step.distance)}</p>
                  </div>
                  {idx === currentStep && (
                    <Badge className="bg-primary text-primary-foreground text-xs">{t('now')}</Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className="border-border"
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const step = routeInfo.steps[currentStep];
                  speakInstruction(`${t('in')} ${formatDistanceText(distanceToNextStep || 0)}, ${getInstructionText(step, destination)}`, true);
                }}
                className="flex-1 border-border"
              >
                🔊 {t('repeat')}
              </Button>
              <Button
                variant="destructive"
                onClick={stopNavigation}
              >
                <Square className="w-4 h-4 mr-2" />
                {t('stop')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Navigation;
