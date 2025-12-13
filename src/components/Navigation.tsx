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
  Globe,
  Mic,
  Settings,
  History
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

// Multi-language translations - 12 languages
const translations: Record<string, Record<string, string>> = {
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
    startRide: 'Start',
    stop: 'Stop',
    repeat: 'Repeat',
    currentLocation: 'Current Location',
    live: 'LIVE',
    searchingGPS: 'Searching GPS...',
    distance: 'Distance',
    time: 'Time',
    eco: 'Eco',
    hazardsLabel: 'Hazards',
    now: 'Now',
    step: 'Step',
    of: 'of',
    distanceTraveled: 'Traveled',
    currentSpeed: 'Speed',
    navigationStarted: 'Navigation started',
    navigationStopped: 'Navigation stopped',
    pleaseEnterDest: 'Please enter destination',
    waitForGPS: 'Waiting for GPS signal',
    congratulations: 'Congratulations!',
    warning: 'Warning',
    ecoTip: 'Eco Tip',
    getReady: 'Get ready!',
    totalDistance: 'Total',
    estimatedTime: 'ETA',
    minutes: 'min',
    home: 'Home',
    office: 'Office',
    petrolPump: 'Gas Station',
    hospital: 'Hospital',
    market: 'Market',
    recentPlaces: 'Recent',
    voiceCommands: 'Voice'
  },
  'hi-IN': {
    straight: 'सीधे जाएं',
    left: 'बाएं मुड़ें',
    right: 'दाएं मुड़ें',
    uturn: 'यू-टर्न लें',
    destination: 'आप अपनी मंज़िल पर पहुंच गए!',
    towards: 'की तरफ',
    meters: 'मीटर',
    km: 'किमी',
    in: 'में',
    busyIntersection: 'व्यस्त चौराहा - सावधान',
    schoolZone: 'स्कूल ज़ोन - धीमे',
    sharpTurn: 'तेज़ मोड़ - धीमे',
    steadySpeed: 'स्थिर गति - ईंधन बचाएं',
    engineBraking: 'इंजन ब्रेकिंग',
    ecoMode: 'इको मोड रखें',
    enterDestination: 'मंज़िल दर्ज करें',
    startRide: 'शुरू',
    stop: 'रुकें',
    repeat: 'दोहराएं',
    currentLocation: 'वर्तमान स्थिति',
    live: 'लाइव',
    searchingGPS: 'GPS ढूंढ रहे...',
    distance: 'दूरी',
    time: 'समय',
    eco: 'इको',
    hazardsLabel: 'खतरे',
    now: 'अभी',
    step: 'चरण',
    of: 'का',
    distanceTraveled: 'तय दूरी',
    currentSpeed: 'गति',
    navigationStarted: 'नेविगेशन शुरू',
    navigationStopped: 'नेविगेशन बंद',
    pleaseEnterDest: 'मंज़िल दर्ज करें',
    waitForGPS: 'GPS की प्रतीक्षा',
    congratulations: 'बधाई हो!',
    warning: 'चेतावनी',
    ecoTip: 'इको टिप',
    getReady: 'तैयार रहें!',
    totalDistance: 'कुल',
    estimatedTime: 'समय',
    minutes: 'मिनट',
    home: 'घर',
    office: 'ऑफिस',
    petrolPump: 'पेट्रोल पंप',
    hospital: 'अस्पताल',
    market: 'बाज़ार',
    recentPlaces: 'हाल के',
    voiceCommands: 'वॉइस'
  },
  'es-ES': {
    straight: 'Siga recto',
    left: 'Gire izquierda',
    right: 'Gire derecha',
    uturn: 'Giro en U',
    destination: '¡Llegó a destino!',
    towards: 'hacia',
    meters: 'metros',
    km: 'km',
    in: 'en',
    busyIntersection: 'Cruce concurrido',
    schoolZone: 'Zona escolar',
    sharpTurn: 'Curva cerrada',
    steadySpeed: 'Velocidad constante',
    engineBraking: 'Freno motor',
    ecoMode: 'Modo eco activo',
    enterDestination: 'Ingrese destino',
    startRide: 'Iniciar',
    stop: 'Parar',
    repeat: 'Repetir',
    currentLocation: 'Ubicación actual',
    live: 'VIVO',
    searchingGPS: 'Buscando GPS...',
    distance: 'Distancia',
    time: 'Tiempo',
    eco: 'Eco',
    hazardsLabel: 'Peligros',
    now: 'Ahora',
    step: 'Paso',
    of: 'de',
    distanceTraveled: 'Recorrido',
    currentSpeed: 'Velocidad',
    navigationStarted: 'Navegación iniciada',
    navigationStopped: 'Navegación detenida',
    pleaseEnterDest: 'Ingrese destino',
    waitForGPS: 'Esperando GPS',
    congratulations: '¡Felicidades!',
    warning: 'Advertencia',
    ecoTip: 'Consejo Eco',
    getReady: '¡Prepárese!',
    totalDistance: 'Total',
    estimatedTime: 'ETA',
    minutes: 'min',
    home: 'Casa',
    office: 'Oficina',
    petrolPump: 'Gasolinera',
    hospital: 'Hospital',
    market: 'Mercado',
    recentPlaces: 'Recientes',
    voiceCommands: 'Voz'
  },
  'fr-FR': {
    straight: 'Tout droit',
    left: 'Tournez à gauche',
    right: 'Tournez à droite',
    uturn: 'Demi-tour',
    destination: 'Vous êtes arrivé!',
    towards: 'vers',
    meters: 'mètres',
    km: 'km',
    in: 'dans',
    busyIntersection: 'Carrefour fréquenté',
    schoolZone: 'Zone scolaire',
    sharpTurn: 'Virage serré',
    steadySpeed: 'Vitesse stable',
    engineBraking: 'Frein moteur',
    ecoMode: 'Mode éco actif',
    enterDestination: 'Entrez destination',
    startRide: 'Démarrer',
    stop: 'Arrêter',
    repeat: 'Répéter',
    currentLocation: 'Position actuelle',
    live: 'DIRECT',
    searchingGPS: 'Recherche GPS...',
    distance: 'Distance',
    time: 'Temps',
    eco: 'Éco',
    hazardsLabel: 'Dangers',
    now: 'Maintenant',
    step: 'Étape',
    of: 'sur',
    distanceTraveled: 'Parcouru',
    currentSpeed: 'Vitesse',
    navigationStarted: 'Navigation démarrée',
    navigationStopped: 'Navigation arrêtée',
    pleaseEnterDest: 'Entrez destination',
    waitForGPS: 'Attente GPS',
    congratulations: 'Félicitations!',
    warning: 'Attention',
    ecoTip: 'Conseil Éco',
    getReady: 'Préparez-vous!',
    totalDistance: 'Total',
    estimatedTime: 'ETA',
    minutes: 'min',
    home: 'Maison',
    office: 'Bureau',
    petrolPump: 'Station',
    hospital: 'Hôpital',
    market: 'Marché',
    recentPlaces: 'Récents',
    voiceCommands: 'Voix'
  },
  'de-DE': {
    straight: 'Geradeaus',
    left: 'Links abbiegen',
    right: 'Rechts abbiegen',
    uturn: 'Wenden',
    destination: 'Ziel erreicht!',
    towards: 'Richtung',
    meters: 'Meter',
    km: 'km',
    in: 'in',
    busyIntersection: 'Belebte Kreuzung',
    schoolZone: 'Schulzone',
    sharpTurn: 'Scharfe Kurve',
    steadySpeed: 'Gleichmäßige Geschwindigkeit',
    engineBraking: 'Motorbremse',
    ecoMode: 'Eco-Modus aktiv',
    enterDestination: 'Ziel eingeben',
    startRide: 'Starten',
    stop: 'Stopp',
    repeat: 'Wiederholen',
    currentLocation: 'Aktueller Standort',
    live: 'LIVE',
    searchingGPS: 'GPS suchen...',
    distance: 'Entfernung',
    time: 'Zeit',
    eco: 'Öko',
    hazardsLabel: 'Gefahren',
    now: 'Jetzt',
    step: 'Schritt',
    of: 'von',
    distanceTraveled: 'Strecke',
    currentSpeed: 'Tempo',
    navigationStarted: 'Navigation gestartet',
    navigationStopped: 'Navigation beendet',
    pleaseEnterDest: 'Ziel eingeben',
    waitForGPS: 'GPS warten',
    congratulations: 'Glückwunsch!',
    warning: 'Warnung',
    ecoTip: 'Öko-Tipp',
    getReady: 'Bereit machen!',
    totalDistance: 'Gesamt',
    estimatedTime: 'ETA',
    minutes: 'min',
    home: 'Zuhause',
    office: 'Büro',
    petrolPump: 'Tankstelle',
    hospital: 'Krankenhaus',
    market: 'Markt',
    recentPlaces: 'Zuletzt',
    voiceCommands: 'Sprache'
  },
  'pt-BR': {
    straight: 'Siga em frente',
    left: 'Vire à esquerda',
    right: 'Vire à direita',
    uturn: 'Faça retorno',
    destination: 'Você chegou!',
    towards: 'em direção a',
    meters: 'metros',
    km: 'km',
    in: 'em',
    busyIntersection: 'Cruzamento movimentado',
    schoolZone: 'Zona escolar',
    sharpTurn: 'Curva fechada',
    steadySpeed: 'Velocidade constante',
    engineBraking: 'Freio motor',
    ecoMode: 'Modo eco ativo',
    enterDestination: 'Digite destino',
    startRide: 'Iniciar',
    stop: 'Parar',
    repeat: 'Repetir',
    currentLocation: 'Local atual',
    live: 'AO VIVO',
    searchingGPS: 'Buscando GPS...',
    distance: 'Distância',
    time: 'Tempo',
    eco: 'Eco',
    hazardsLabel: 'Perigos',
    now: 'Agora',
    step: 'Passo',
    of: 'de',
    distanceTraveled: 'Percorrido',
    currentSpeed: 'Velocidade',
    navigationStarted: 'Navegação iniciada',
    navigationStopped: 'Navegação parada',
    pleaseEnterDest: 'Digite destino',
    waitForGPS: 'Aguardando GPS',
    congratulations: 'Parabéns!',
    warning: 'Aviso',
    ecoTip: 'Dica Eco',
    getReady: 'Prepare-se!',
    totalDistance: 'Total',
    estimatedTime: 'ETA',
    minutes: 'min',
    home: 'Casa',
    office: 'Escritório',
    petrolPump: 'Posto',
    hospital: 'Hospital',
    market: 'Mercado',
    recentPlaces: 'Recentes',
    voiceCommands: 'Voz'
  },
  'ja-JP': {
    straight: 'まっすぐ',
    left: '左折',
    right: '右折',
    uturn: 'Uターン',
    destination: '目的地に到着!',
    towards: '方向へ',
    meters: 'm',
    km: 'km',
    in: '後',
    busyIntersection: '混雑した交差点',
    schoolZone: 'スクールゾーン',
    sharpTurn: '急カーブ',
    steadySpeed: '一定速度を維持',
    engineBraking: 'エンジンブレーキ',
    ecoMode: 'エコモード',
    enterDestination: '目的地を入力',
    startRide: 'スタート',
    stop: '停止',
    repeat: '繰り返す',
    currentLocation: '現在地',
    live: 'ライブ',
    searchingGPS: 'GPS検索中...',
    distance: '距離',
    time: '時間',
    eco: 'エコ',
    hazardsLabel: '危険',
    now: '現在',
    step: 'ステップ',
    of: '/',
    distanceTraveled: '移動距離',
    currentSpeed: '速度',
    navigationStarted: 'ナビ開始',
    navigationStopped: 'ナビ停止',
    pleaseEnterDest: '目的地を入力',
    waitForGPS: 'GPS待機中',
    congratulations: 'おめでとう!',
    warning: '警告',
    ecoTip: 'エコヒント',
    getReady: '準備!',
    totalDistance: '総距離',
    estimatedTime: '予定',
    minutes: '分',
    home: '自宅',
    office: 'オフィス',
    petrolPump: 'GS',
    hospital: '病院',
    market: '市場',
    recentPlaces: '最近',
    voiceCommands: '音声'
  },
  'zh-CN': {
    straight: '直行',
    left: '左转',
    right: '右转',
    uturn: '掉头',
    destination: '已到达目的地!',
    towards: '朝向',
    meters: '米',
    km: '公里',
    in: '后',
    busyIntersection: '繁忙路口',
    schoolZone: '学校区域',
    sharpTurn: '急转弯',
    steadySpeed: '保持稳定速度',
    engineBraking: '发动机制动',
    ecoMode: '环保模式',
    enterDestination: '输入目的地',
    startRide: '开始',
    stop: '停止',
    repeat: '重复',
    currentLocation: '当前位置',
    live: '实时',
    searchingGPS: '搜索GPS...',
    distance: '距离',
    time: '时间',
    eco: '环保',
    hazardsLabel: '危险',
    now: '现在',
    step: '步骤',
    of: '/',
    distanceTraveled: '已行驶',
    currentSpeed: '速度',
    navigationStarted: '导航开始',
    navigationStopped: '导航停止',
    pleaseEnterDest: '请输入目的地',
    waitForGPS: '等待GPS',
    congratulations: '恭喜!',
    warning: '警告',
    ecoTip: '环保提示',
    getReady: '准备!',
    totalDistance: '总计',
    estimatedTime: '预计',
    minutes: '分',
    home: '家',
    office: '办公室',
    petrolPump: '加油站',
    hospital: '医院',
    market: '市场',
    recentPlaces: '最近',
    voiceCommands: '语音'
  },
  'ar-SA': {
    straight: 'استمر',
    left: 'يسارًا',
    right: 'يمينًا',
    uturn: 'استدر',
    destination: 'وصلت!',
    towards: 'باتجاه',
    meters: 'متر',
    km: 'كم',
    in: 'في',
    busyIntersection: 'تقاطع مزدحم',
    schoolZone: 'منطقة مدرسة',
    sharpTurn: 'منعطف حاد',
    steadySpeed: 'سرعة ثابتة',
    engineBraking: 'فرملة المحرك',
    ecoMode: 'وضع اقتصادي',
    enterDestination: 'أدخل الوجهة',
    startRide: 'ابدأ',
    stop: 'توقف',
    repeat: 'كرر',
    currentLocation: 'الموقع الحالي',
    live: 'مباشر',
    searchingGPS: 'بحث GPS...',
    distance: 'المسافة',
    time: 'الوقت',
    eco: 'اقتصادي',
    hazardsLabel: 'مخاطر',
    now: 'الآن',
    step: 'خطوة',
    of: 'من',
    distanceTraveled: 'المقطوعة',
    currentSpeed: 'السرعة',
    navigationStarted: 'بدأ التنقل',
    navigationStopped: 'توقف التنقل',
    pleaseEnterDest: 'أدخل الوجهة',
    waitForGPS: 'انتظار GPS',
    congratulations: 'تهانينا!',
    warning: 'تحذير',
    ecoTip: 'نصيحة',
    getReady: 'استعد!',
    totalDistance: 'الكلية',
    estimatedTime: 'الوقت',
    minutes: 'دقيقة',
    home: 'المنزل',
    office: 'المكتب',
    petrolPump: 'محطة',
    hospital: 'مستشفى',
    market: 'سوق',
    recentPlaces: 'الأخيرة',
    voiceCommands: 'صوت'
  },
  'ta-IN': {
    straight: 'நேராக செல்லுங்கள்',
    left: 'இடது திரும்பு',
    right: 'வலது திரும்பு',
    uturn: 'U-திருப்பம்',
    destination: 'இலக்கு அடைந்தீர்!',
    towards: 'நோக்கி',
    meters: 'மீ',
    km: 'கிமீ',
    in: 'இல்',
    busyIntersection: 'பிஸி சந்திப்பு',
    schoolZone: 'பள்ளி மண்டலம்',
    sharpTurn: 'கூர்மையான திருப்பம்',
    steadySpeed: 'நிலையான வேகம்',
    engineBraking: 'இன்ஜின் பிரேக்',
    ecoMode: 'எகோ மோட்',
    enterDestination: 'இலக்கை உள்ளிடவும்',
    startRide: 'தொடங்கு',
    stop: 'நிறுத்து',
    repeat: 'மீண்டும்',
    currentLocation: 'தற்போதைய இருப்பிடம்',
    live: 'நேரலை',
    searchingGPS: 'GPS தேடுகிறது...',
    distance: 'தூரம்',
    time: 'நேரம்',
    eco: 'எகோ',
    hazardsLabel: 'ஆபத்துகள்',
    now: 'இப்போது',
    step: 'படி',
    of: '/',
    distanceTraveled: 'பயணித்த',
    currentSpeed: 'வேகம்',
    navigationStarted: 'வழிசெலுத்தல் தொடங்கியது',
    navigationStopped: 'வழிசெலுத்தல் நிறுத்தப்பட்டது',
    pleaseEnterDest: 'இலக்கை உள்ளிடவும்',
    waitForGPS: 'GPS காத்திருக்கிறது',
    congratulations: 'வாழ்த்துக்கள்!',
    warning: 'எச்சரிக்கை',
    ecoTip: 'எகோ டிப்',
    getReady: 'தயாராகுங்கள்!',
    totalDistance: 'மொத்தம்',
    estimatedTime: 'நேரம்',
    minutes: 'நிமிடம்',
    home: 'வீடு',
    office: 'அலுவலகம்',
    petrolPump: 'பெட்ரோல் பங்க்',
    hospital: 'மருத்துவமனை',
    market: 'சந்தை',
    recentPlaces: 'சமீபத்திய',
    voiceCommands: 'குரல்'
  },
  'te-IN': {
    straight: 'నేరుగా వెళ్ళండి',
    left: 'ఎడమ వైపు తిరగండి',
    right: 'కుడి వైపు తిరగండి',
    uturn: 'U-టర్న్',
    destination: 'గమ్యం చేరుకున్నారు!',
    towards: 'వైపు',
    meters: 'మీ',
    km: 'కిమీ',
    in: 'లో',
    busyIntersection: 'రద్దీ కూడలి',
    schoolZone: 'స్కూల్ జోన్',
    sharpTurn: 'పదునైన మలుపు',
    steadySpeed: 'స్థిర వేగం',
    engineBraking: 'ఇంజిన్ బ్రేకింగ్',
    ecoMode: 'ఎకో మోడ్',
    enterDestination: 'గమ్యం నమోదు చేయండి',
    startRide: 'ప్రారంభం',
    stop: 'ఆపు',
    repeat: 'మళ్ళీ',
    currentLocation: 'ప్రస్తుత స్థానం',
    live: 'లైవ్',
    searchingGPS: 'GPS వెతుకుతోంది...',
    distance: 'దూరం',
    time: 'సమయం',
    eco: 'ఎకో',
    hazardsLabel: 'ప్రమాదాలు',
    now: 'ఇప్పుడు',
    step: 'స్టెప్',
    of: '/',
    distanceTraveled: 'ప్రయాణించిన',
    currentSpeed: 'వేగం',
    navigationStarted: 'నావిగేషన్ ప్రారంభమైంది',
    navigationStopped: 'నావిగేషన్ ఆగిపోయింది',
    pleaseEnterDest: 'గమ్యం నమోదు చేయండి',
    waitForGPS: 'GPS వేచి ఉంది',
    congratulations: 'అభినందనలు!',
    warning: 'హెచ్చరిక',
    ecoTip: 'ఎకో టిప్',
    getReady: 'సిద్ధంగా ఉండండి!',
    totalDistance: 'మొత్తం',
    estimatedTime: 'సమయం',
    minutes: 'నిమిషం',
    home: 'ఇల్లు',
    office: 'ఆఫీసు',
    petrolPump: 'పెట్రోల్ పంప్',
    hospital: 'ఆసుపత్రి',
    market: 'మార్కెట్',
    recentPlaces: 'ఇటీవల',
    voiceCommands: 'వాయిస్'
  },
  'bn-IN': {
    straight: 'সোজা যান',
    left: 'বামে ঘুরুন',
    right: 'ডানে ঘুরুন',
    uturn: 'U-টার্ন',
    destination: 'গন্তব্যে পৌঁছেছেন!',
    towards: 'দিকে',
    meters: 'মি',
    km: 'কিমি',
    in: 'এ',
    busyIntersection: 'ব্যস্ত চৌরাস্তা',
    schoolZone: 'স্কুল জোন',
    sharpTurn: 'তীক্ষ্ণ মোড়',
    steadySpeed: 'স্থির গতি',
    engineBraking: 'ইঞ্জিন ব্রেকিং',
    ecoMode: 'ইকো মোড',
    enterDestination: 'গন্তব্য লিখুন',
    startRide: 'শুরু',
    stop: 'থামুন',
    repeat: 'পুনরায়',
    currentLocation: 'বর্তমান অবস্থান',
    live: 'লাইভ',
    searchingGPS: 'GPS খুঁজছে...',
    distance: 'দূরত্ব',
    time: 'সময়',
    eco: 'ইকো',
    hazardsLabel: 'বিপদ',
    now: 'এখন',
    step: 'ধাপ',
    of: '/',
    distanceTraveled: 'ভ্রমণ করা',
    currentSpeed: 'গতি',
    navigationStarted: 'নেভিগেশন শুরু',
    navigationStopped: 'নেভিগেশন বন্ধ',
    pleaseEnterDest: 'গন্তব্য লিখুন',
    waitForGPS: 'GPS অপেক্ষা করছে',
    congratulations: 'অভিনন্দন!',
    warning: 'সতর্কতা',
    ecoTip: 'ইকো টিপ',
    getReady: 'প্রস্তুত হন!',
    totalDistance: 'মোট',
    estimatedTime: 'সময়',
    minutes: 'মিনিট',
    home: 'বাড়ি',
    office: 'অফিস',
    petrolPump: 'পেট্রোল পাম্প',
    hospital: 'হাসপাতাল',
    market: 'বাজার',
    recentPlaces: 'সাম্প্রতিক',
    voiceCommands: 'ভয়েস'
  }
};

const languages = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'hi-IN', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'ta-IN', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te-IN', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn-IN', name: 'বাংলা', flag: '🇮🇳' },
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
  const [language, setLanguage] = useState('en-US');
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
      case 'left': return <ArrowLeft className="w-6 h-6 sm:w-8 sm:h-8" />;
      case 'right': return <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8" />;
      case 'uturn': return <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8" />;
      case 'destination': return <Target className="w-6 h-6 sm:w-8 sm:h-8" />;
      default: return <ArrowUp className="w-6 h-6 sm:w-8 sm:h-8" />;
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
      <CardHeader className="bg-gradient-to-r from-primary/20 to-accent/20 py-2 sm:py-3 px-3 sm:px-4">
        <CardTitle className="flex flex-wrap items-center gap-2 sm:gap-3 text-foreground text-sm sm:text-base">
          <NavIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          <span className="truncate">AI Navigation</span>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[90px] sm:w-[120px] h-7 sm:h-8 text-[10px] sm:text-xs bg-background/50 border-border">
                <Globe className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-1 sm:gap-2">
                      <span>{lang.flag}</span>
                      <span className="text-xs sm:text-sm">{lang.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary text-[10px] sm:text-xs hidden sm:flex">
              <Leaf className="w-3 h-3 mr-1" />
              {t('eco')}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 space-y-3 sm:space-y-4">
        {/* Current Location Display */}
        <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/30 rounded-lg border border-border">
          <Locate className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground">{t('currentLocation')} ({t('live')})</p>
            {locationData ? (
              <p className="text-xs sm:text-sm font-mono text-foreground truncate">
                {locationData.latitude.toFixed(4)}°N, {locationData.longitude.toFixed(4)}°E
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-warning animate-pulse">{t('searchingGPS')}</p>
            )}
          </div>
          {locationData?.speed && (
            <Badge className="bg-primary/20 text-primary text-[10px] sm:text-xs flex-shrink-0">
              {Math.round(locationData.speed * 3.6)} km/h
            </Badge>
          )}
        </div>

        {/* Destination Input */}
        {!isNavigating && (
          <div className="space-y-2 sm:space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MapPin className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={t('enterDestination')}
                  className="pl-7 sm:pl-10 bg-muted/50 border-border text-sm h-9 sm:h-10"
                />
              </div>
              <Button 
                onClick={startNavigation} 
                className="bg-primary text-primary-foreground hover:bg-primary/80 h-9 sm:h-10 px-3 sm:px-4"
                disabled={!locationData}
              >
                <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">{t('startRide')}</span>
              </Button>
            </div>
            
            {/* Quick destinations */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {quickDestinations.map((place) => (
                <Button
                  key={place.key}
                  variant="outline"
                  size="sm"
                  onClick={() => setDestination(t(place.key))}
                  className="text-[10px] sm:text-xs border-border hover:bg-muted h-7 sm:h-8 px-2 sm:px-3"
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
          <div className="space-y-3 sm:space-y-4">
            {/* Live Distance to Next Step */}
            <div className="bg-gradient-to-br from-primary/30 to-accent/30 rounded-xl p-4 sm:p-6 text-center relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <Badge className="bg-background/80 text-foreground animate-pulse text-[10px] sm:text-xs">
                  <Navigation2 className="w-3 h-3 mr-1" />
                  {t('live')}
                </Badge>
              </div>
              
              <div className="flex justify-center mb-2 sm:mb-3">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary neon-border animate-pulse">
                  {getDirectionIcon(routeInfo.steps[currentStep].direction)}
                </div>
              </div>
              
              {distanceToNextStep !== null && (
                <p className="text-2xl sm:text-3xl font-black text-primary mb-1 sm:mb-2">
                  {formatDistanceText(distanceToNextStep)}
                </p>
              )}
              
              <p className="text-sm sm:text-lg font-bold text-foreground mb-1 line-clamp-2">
                {getInstructionText(routeInfo.steps[currentStep], destination)}
              </p>
              
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('step')} {currentStep + 1} {t('of')} {routeInfo.steps.length}
              </p>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 sm:p-3 bg-muted/30 rounded-lg border border-primary/30">
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t('distanceTraveled')}</p>
                <p className="text-sm sm:text-lg font-bold text-primary">{formatDistanceText(totalDistanceTraveled)}</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-muted/30 rounded-lg border border-secondary/30">
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t('currentSpeed')}</p>
                <p className="text-sm sm:text-lg font-bold text-secondary">
                  {locationData?.speed ? Math.round(locationData.speed * 3.6) : 0} km/h
                </p>
              </div>
            </div>

            {/* Hazard Warning */}
            {routeInfo.steps[currentStep].hazardKey && (
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-warning/20 rounded-lg border border-warning/50 animate-pulse">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-warning flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-warning">
                  {t(routeInfo.steps[currentStep].hazardKey!)}
                </span>
              </div>
            )}

            {/* Eco Tip */}
            {routeInfo.steps[currentStep].ecoTipKey && (
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-primary/10 rounded-lg border border-primary/30">
                <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm text-primary">
                  {t(routeInfo.steps[currentStep].ecoTipKey!)}
                </span>
              </div>
            )}

            {/* Route Info */}
            <div className="grid grid-cols-4 gap-1 sm:gap-2">
              <div className="text-center p-1.5 sm:p-2 bg-muted/30 rounded-lg">
                <Route className="w-3 h-3 sm:w-4 sm:h-4 mx-auto text-primary mb-0.5 sm:mb-1" />
                <p className="text-[9px] sm:text-xs text-muted-foreground">{t('totalDistance')}</p>
                <p className="text-[10px] sm:text-sm font-bold text-foreground">{formatDistanceText(routeInfo.totalDistance)}</p>
              </div>
              <div className="text-center p-1.5 sm:p-2 bg-muted/30 rounded-lg">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 mx-auto text-secondary mb-0.5 sm:mb-1" />
                <p className="text-[9px] sm:text-xs text-muted-foreground">{t('time')}</p>
                <p className="text-[10px] sm:text-sm font-bold text-foreground">8 {t('minutes')}</p>
              </div>
              <div className="text-center p-1.5 sm:p-2 bg-muted/30 rounded-lg">
                <Leaf className="w-3 h-3 sm:w-4 sm:h-4 mx-auto text-primary mb-0.5 sm:mb-1" />
                <p className="text-[9px] sm:text-xs text-muted-foreground">{t('eco')}</p>
                <p className="text-[10px] sm:text-sm font-bold text-primary">{routeInfo.ecoScore}%</p>
              </div>
              <div className="text-center p-1.5 sm:p-2 bg-muted/30 rounded-lg">
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mx-auto text-warning mb-0.5 sm:mb-1" />
                <p className="text-[9px] sm:text-xs text-muted-foreground">{t('hazardsLabel')}</p>
                <p className="text-[10px] sm:text-sm font-bold text-warning">{routeInfo.hazards}</p>
              </div>
            </div>

            {/* Steps Preview */}
            <div className="space-y-1.5 sm:space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
              {routeInfo.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg transition-all ${
                    idx === currentStep 
                      ? 'bg-primary/20 border-2 border-primary/50 scale-[1.02]' 
                      : idx < currentStep 
                        ? 'opacity-50 bg-muted/10' 
                        : 'bg-muted/20'
                  }`}
                >
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    idx === currentStep ? 'bg-primary text-primary-foreground animate-pulse' : 
                    idx < currentStep ? 'bg-muted text-muted-foreground' : 'bg-muted/50'
                  }`}>
                    {getDirectionIcon(step.direction)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-foreground line-clamp-1">{getInstructionText(step, destination)}</p>
                    <p className="text-[9px] sm:text-xs text-muted-foreground">{formatDistanceText(step.distance)}</p>
                  </div>
                  {idx === currentStep && (
                    <Badge className="bg-primary text-primary-foreground text-[9px] sm:text-xs flex-shrink-0">{t('now')}</Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className="border-border w-9 h-9 sm:w-10 sm:h-10"
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const step = routeInfo.steps[currentStep];
                  speakInstruction(`${t('in')} ${formatDistanceText(distanceToNextStep || 0)}, ${getInstructionText(step, destination)}`, true);
                }}
                className="flex-1 border-border h-9 sm:h-10 text-xs sm:text-sm"
              >
                🔊 {t('repeat')}
              </Button>
              <Button
                variant="destructive"
                onClick={stopNavigation}
                className="h-9 sm:h-10 px-3 sm:px-4"
              >
                <Square className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">{t('stop')}</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Navigation;
