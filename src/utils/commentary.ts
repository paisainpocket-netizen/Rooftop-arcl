import { BallOutcome, WicketType } from '../types/cricket';

type Lang = 'pa' | 'hi' | 'en';

export function generateCommentary(
  ball: Partial<BallOutcome>,
  strikerName: string,
  bowlerName: string,
  totalRuns: number,
  totalWickets: number,
  lang: Lang = 'en'
): string {
  const { runsBat = 0, isWicket = false, wicketType, extraType = 'none', isFour = false, isSix = false, isFreeHit = false } = ball;

  if (isWicket) {
    switch (wicketType) {
      case 'direct_roof_out':
        if (lang === 'pa') return `ਵੱਡਾ ਸ਼ਾਟ, ਪਰ ਛੱਤ ਤੋਂ ਬਾਹਰ! ${strikerName} ਨਿਯਮ ਮੁਤਾਬਕ ਆਊਟ! (${totalRuns}/${totalWickets})`;
        return `Big shot, but out of the roof! ${strikerName} is out under the rooftop rule! (${totalRuns}/${totalWickets})`;

      case 'wall_catch':
        if (lang === 'pa') return `ਗੇਂਦ ਕੰਧ ਨਾਲ ਟਕਰਾਈ, ਫੀਲਡਰ ਨੇ ਲਪਕ ਲਈ! ${strikerName} ਆਊਟ! (${totalRuns}/${totalWickets})`;
        return `Ball hits the wall, the fielder snaps it up! ${strikerName} is out! (${totalRuns}/${totalWickets})`;

      case 'bowled':
        if (lang === 'pa') return `ਹਾਏ! ${strikerName} ਬਿਲਕੁਲ ਧੋਖਾ ਖਾ ਗਿਆ, ${bowlerName} ਨੇ ਸਟੰਪਾਂ ਖਿਲਾਰ ਦਿੱਤੀਆਂ! (${totalRuns}/${totalWickets})`;
        return `Beaten all ends up! ${bowlerName} sends the stumps flying, ${strikerName} is bowled! (${totalRuns}/${totalWickets})`;

      case 'caught':
        if (lang === 'pa') return `ਵੱਡਾ ਸ਼ਾਟ ਖੇਡਣ ਦੀ ਕੋਸ਼ਿਸ਼, ਪਰ ਸਿੱਧਾ ਫੀਲਡਰ ਦੇ ਹੱਥਾਂ 'ਚ! ${strikerName} ਕੈਚ ਆਊਟ! (${totalRuns}/${totalWickets})`;
        return `Went for the big shot, but straight into the fielder's hands! ${strikerName} is caught! (${totalRuns}/${totalWickets})`;

      case 'runout':
        if (lang === 'pa') return `ਦੋਹਾਂ ਬੱਲੇਬਾਜ਼ਾਂ 'ਚ ਕਨਫਿਊਜ਼ਨ! ਸਿੱਧੀ ਥਰੋਅ ਵਿਕਟ 'ਤੇ, ${strikerName} ਆਊਟ! (${totalRuns}/${totalWickets})`;
        return `Mix-up between the batsmen! Direct hit on the stumps, ${strikerName} is run out! (${totalRuns}/${totalWickets})`;

      case 'stumped':
        if (lang === 'pa') return `ਸਟੰਪਡ! ${strikerName} ਕ੍ਰੀਜ਼ ਤੋਂ ਬਾਹਰ ਨਿਕਲ ਗਿਆ, ਕੀਪਰ ਨੇ ਮੌਕਾ ਨਹੀਂ ਖੁੰਝਾਇਆ! (${totalRuns}/${totalWickets})`;
        return `Stumped! ${strikerName} was out of the crease, the keeper doesn't miss! (${totalRuns}/${totalWickets})`;

      case 'lbw':
        if (lang === 'pa') return `ਸਿੱਧੀ ਪੈਡ 'ਤੇ ਵੱਜੀ ਗੇਂਦ! ਜ਼ੋਰਦਾਰ ਅਪੀਲ ਤੇ ਅੰਪਾਇਰ ਨੇ ${strikerName} ਨੂੰ ਆਊਟ ਦੇ ਦਿੱਤਾ! (${totalRuns}/${totalWickets})`;
        return `Struck right on the pad! Big appeal, and the umpire raises the finger — ${strikerName} is out LBW! (${totalRuns}/${totalWickets})`;

      case 'hitwicket':
        if (lang === 'pa') return `ਬਦਕਿਸਮਤੀ! ${strikerName} ਪਿੱਛੇ ਹਟਦੇ ਹੋਏ ਖੁਦ ਆਪਣੀ ਵਿਕਟ ਨਾਲ ਟਕਰਾ ਗਿਆ, ਹਿੱਟ ਵਿਕਟ ਆਊਟ! (${totalRuns}/${totalWickets})`;
        return `Unlucky! ${strikerName} steps back and dislodges the bails, hit wicket! (${totalRuns}/${totalWickets})`;

      default:
        if (lang === 'pa') return `ਵਿਕਟ ਡਿੱਗੀ! ${strikerName} ਆਊਟ, ${bowlerName} ਨੂੰ ਵੱਡੀ ਸਫਲਤਾ! (${totalRuns}/${totalWickets})`;
        return `Wicket! ${strikerName} is out, a big breakthrough for ${bowlerName}! (${totalRuns}/${totalWickets})`;
    }
  }

  if (isSix) {
    if (lang === 'pa') return `ਹਾਏ ਓਏ! ${strikerName} ਨੇ ਗੇਂਦ ਨੂੰ ਅਸਮਾਨ 'ਚ ਭੇਜ ਦਿੱਤਾ, ਛੱਕਾ ਵੱਜ ਗਿਆ ਵੀਰੋ!`;
    return `Massive hit! ${strikerName} sends it soaring, that's a huge SIX!`;
  }

  if (isFour) {
    if (lang === 'pa') return `ਸ਼ਾਨਦਾਰ ਸ਼ਾਟ! ${strikerName} ਨੇ ਗੈਪ ਲੱਭ ਲਿਆ, ਗੇਂਦ ਸਿੱਧੀ ਬਾਊਂਡਰੀ ਪਾਰ, ਚਾਰ ਦੌੜਾਂ!`;
    return `Great shot! ${strikerName} finds the gap, races away to the boundary for FOUR!`;
  }

  if (extraType === 'wide') {
    if (lang === 'pa') return `ਵਾਈਡ ਬਾਲ, ਇੱਕ ਦੌੜ ਵਾਧੂ।`;
    return `Wide ball, one extra run.`;
  }

  if (extraType === 'noBall') {
    if (lang === 'pa') return `ਨੋ ਬਾਲ! ਫ੍ਰੀ ਹਿੱਟ ਤਿਆਰ।`;
    return `No ball! Free hit coming up.`;
  }

  if (runsBat === 0) {
    if (lang === 'pa') return `ਵਧੀਆ ਗੇਂਦ, ਕੋਈ ਦੌੜ ਨਹੀਂ।`;
    return `Good ball, no run.`;
  }

  if (runsBat === 1) {
    if (lang === 'pa') return `${strikerName} ਨੇ ਇੱਕ ਦੌੜ ਲੈ ਲਈ।`;
    return `${strikerName} takes a quick single.`;
  }

  if (runsBat === 2) {
    if (lang === 'pa') return `ਚੰਗੀ ਪਲੇਸਿੰਗ! ${strikerName} ਨੇ ਦੋ ਦੌੜਾਂ ਚੁਰਾ ਲਈਆਂ।`;
    return `Good placement! ${strikerName} picks up two runs.`;
  }

  if (runsBat === 3) {
    if (lang === 'pa') return `ਬਹੁਤ ਵਧੀਆ ਦੌੜ! ${strikerName} ਤੇ ਸਾਥੀ ਨੇ ਤਿੰਨ ਦੌੜਾਂ ਪੂਰੀਆਂ ਕੀਤੀਆਂ!`;
    return `Excellent running! ${strikerName} and partner complete three runs!`;
  }

  if (lang === 'pa') return `${bowlerName} ਵੱਲੋਂ ${strikerName} ਨੂੰ, ${runsBat} ਦੌੜਾਂ। ਸਕੋਰ: ${totalRuns}/${totalWickets}`;
  return `${bowlerName} to ${strikerName}, ${runsBat} run(s) scored. Total: ${totalRuns}/${totalWickets}`;
}

// Batsman Under Pressure: 3 consecutive dot balls faced
export function getPressureBatsmanText(batterName: string, lang: 'pa' | 'hi' | 'en'): string {
  if (lang === 'pa') return `ਹੁਣ ${batterName} ਲਈ ਗੱਲ ਔਖੀ ਹੋ ਗਈ, ਲਗਾਤਾਰ ਤਿੰਨ ਗੇਂਦਾਂ 'ਤੇ ਕੋਈ ਦੌੜ ਨਹੀਂ!`;
  if (lang === 'hi') return `${batterName} अब दबाव में हैं! लगातार तीन डॉट बॉल खेल ली हैं, रन बनाना मुश्किल हो रहा है!`;
  return `${batterName} is under pressure now, three dot balls in a row!`;
}

// Bowler Under Pressure: 3 boundaries conceded off this bowler
export function getPressureBowlerText(bowlerName: string, lang: 'pa' | 'hi' | 'en'): string {
  if (lang === 'pa') return `ਕਪਤਾਨ ਪਰੇਸ਼ਾਨ! ${bowlerName} ਦੀ ਗੇਂਦਬਾਜ਼ੀ 'ਚ ਲਗਾਤਾਰ ਬਾਊਂਡਰੀਆਂ ਪੈ ਰਹੀਆਂ!`;
  if (lang === 'hi') return `${bowlerName} अब दबाव में हैं! लगातार बाउंड्री लग रही हैं, कप्तान को कुछ सोचना होगा!`;
  return `Captain is worried! ${bowlerName} keeps leaking boundaries!`;
}

// Hat-trick Celebration: bowler takes 3 wickets in a row
export function getHatTrickText(bowlerName: string, lang: 'pa' | 'hi' | 'en'): string {
  if (lang === 'pa') return `ਹੈਟ੍ਰਿਕ! ${bowlerName} ਨੇ ਇਤਿਹਾਸ ਰਚ ਦਿੱਤਾ, ਤਿੰਨ ਗੇਂਦਾਂ ਤੇ ਤਿੰਨ ਵਿਕਟਾਂ!`;
  if (lang === 'hi') return `हैट्रिक! हैट्रिक! हैट्रिक! ${bowlerName} ने कमाल कर दिया, लगातार तीन गेंदों पर तीन विकेट! क्या शानदार स्पेल है!`;
  return `Hat-trick! ${bowlerName} makes history, three wickets in three balls!`;
}

// Maiden Over Special Announcement
export function getMaidenOverText(bowlerName: string, lang: 'pa' | 'hi' | 'en'): string {
  if (lang === 'pa') return `ਕਿਆ ਬੋਲਿੰਗ ਕੀਤੀ ਹੈ, ${bowlerName} ਨੇ ਮੇਡਨ ਓਵਰ ਪਾ ਕੇ ਕਮਾਲ ਕਰ ਦਿੱਤਾ!`;
  if (lang === 'hi') return `क्या बोलिंग की है, ${bowlerName} ने मेडन ओवर डालकर कमाल कर दिया!`;
  return `Superb bowling! ${bowlerName} delivers a brilliant maiden over!`;
}
