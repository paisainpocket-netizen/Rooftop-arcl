import { BallOutcome, WicketType } from '../types/cricket';

export function generateCommentary(
  ball: Partial<BallOutcome>,
  strikerName: string,
  bowlerName: string,
  totalRuns: number,
  totalWickets: number
): string {
  const { runsBat = 0, isWicket = false, wicketType, extraType = 'none', isFour = false, isSix = false, isFreeHit = false } = ball;

  if (isWicket) {
    switch (wicketType) {
      case 'direct_roof_out':
        return `⚠️ DIRECT ROOF OUT! ${strikerName} ne ball terrace boundary ton bahar uda ditti! Rooftop rule de hisaab naal batsman OUT! Score: ${totalRuns}/${totalWickets}. Ball dhoondhn kaun jaayega?!`;
      case 'wall_catch':
        return `💥 KANDH LAG KE CATCH! One hand one bounce off the wall! Clean catch by the fielder, ${strikerName} has to walk back! (${totalRuns}/${totalWickets})`;
      case 'bowled':
        return `🎯 TIMBERRR! ${bowlerName} sends the stumps flying! Perfect yorker on the concrete pitch! ${strikerName} completely beaten! (${totalRuns}/${totalWickets})`;
      case 'caught':
        return `🧤 OUT! In the air... and safely caught inside the roof net! Huge wicket for ${bowlerName}! ${strikerName} departs. (${totalRuns}/${totalWickets})`;
      case 'runout':
        return `⚡ RUN OUT! Miscommunication between the wickets! Direct hit and ${strikerName} is miles out of his crease! (${totalRuns}/${totalWickets})`;
      case 'stumped':
        return `⚡ STUMPED! ${strikerName} steps down the track, misses, and the keeper does the rest in a flash! (${totalRuns}/${totalWickets})`;
      case 'lbw':
        return `☝️ APPEAL & OUT! Right in front of the middle stump, umpire raises the finger! LBW! (${totalRuns}/${totalWickets})`;
      case 'hitwicket':
        return `🤦‍♂️ HIT WICKET! ${strikerName} moves back too deep and dislodges the bails! Unlucky dismissal! (${totalRuns}/${totalWickets})`;
      default:
        return `🚨 WICKET! ${strikerName} is OUT! ${bowlerName} gets the breakthrough! Score moves to ${totalRuns}/${totalWickets}.`;
    }
  }

  if (isSix) {
    const lines = [
      `🚀 SHOT YAAR! ${strikerName} smashes it high into the Amritsar sky! Massive maximum over the water tank! 6 RUNS!`,
      `🔥 BOOM! Gagan-chumbi sixer by ${strikerName}! Sweet sound off the bat, straight into the safe net! 6 Runs!`,
      `⭐ WHAT A HIT! Right in the slot and ${strikerName} launches it into orbit! 6 runs added to the total!`,
      `🏏 PURE POWER! ${strikerName} pulls it over mid-wicket for a gigantic terrace six! Majestic stroke!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  if (isFour) {
    const lines = [
      `⚡ CHAUQA! Pierces the gap between the two water tanks! Lightning fast boundary for ${strikerName}! 4 Runs!`,
      `🔥 CLASSIC DRIVE! ${strikerName} creams it along the rooftop floor for a crisp FOUR! Beautiful timing!`,
      `🎯 BOUNDARY! Edge and flies past slip to the corner net for 4 valuable runs!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  if (extraType === 'wide') {
    return `↔️ Wide ball by ${bowlerName}. Straying down the leg side, umpire stretches both arms. 1 extra added.`;
  }

  if (extraType === 'noBall') {
    return `🚨 NO BALL! ${bowlerName} oversteps the line! 1 run penalty + FREE HIT coming up next!`;
  }

  if (runsBat === 0) {
    const dots = [
      `Dot ball. Good tight bowling by ${bowlerName}, no run conceded.`,
      `Defended solidly into the pitch by ${strikerName}. Zero runs.`,
      `Beaten outside off! Sharp tennis bounce, no run.`,
      `Played straight to the fielder stationed by the terrace railing. Dot ball.`
    ];
    return dots[Math.floor(Math.random() * dots.length)];
  }

  if (runsBat === 1) {
    return `Quick single taken by ${strikerName}, good aggressive running between the wickets. 1 run.`;
  }

  if (runsBat === 2) {
    return `Tucked away softly on the leg side, rapid running turns 1 into 2 runs!`;
  }

  if (runsBat === 3) {
    return `Great placement and super fast running! Batsmen hustle for 3 runs!`;
  }

  return `${bowlerName} to ${strikerName}, ${runsBat} run(s) scored. Total: ${totalRuns}/${totalWickets}`;
}

// Batsman Under Pressure: 3 consecutive dot balls faced
export function getPressureBatsmanText(batterName: string, lang: 'pa' | 'hi' | 'en'): string {
  if (lang === 'pa') return `${batterName} ਹੁਣ ਦਬਾਅ ਹੇਠ ਹੈ! ਲਗਾਤਾਰ ਤਿੰਨ ਡਾਟ ਬਾਲਾਂ ਖੇਡ ਲਈਆਂ, ਰਨ ਬਣਾਉਣੇ ਔਖੇ ਹੋ ਰਹੇ ਨੇ!`;
  if (lang === 'hi') return `${batterName} अब दबाव में हैं! लगातार तीन डॉट बॉल खेल ली हैं, रन बनाना मुश्किल हो रहा है!`;
  return `${batterName} is now under pressure! Three dot balls in a row, struggling to get the runs flowing!`;
}

// Bowler Under Pressure: 3 boundaries conceded off this bowler
export function getPressureBowlerText(bowlerName: string, lang: 'pa' | 'hi' | 'en'): string {
  if (lang === 'pa') return `${bowlerName} ਹੁਣ ਦਬਾਅ ਹੇਠ ਹੈ! ਲਗਾਤਾਰ ਬਾਊਂਡਰੀਆਂ ਵੱਜ ਰਹੀਆਂ ਨੇ, ਕਪਤਾਨ ਨੂੰ ਕੁਝ ਸੋਚਣਾ ਪਵੇਗਾ!`;
  if (lang === 'hi') return `${bowlerName} अब दबाव में हैं! लगातार बाउंड्री लग रही हैं, कप्तान को कुछ सोचना होगा!`;
  return `${bowlerName} is under real pressure now! Boundaries keep flowing, the captain might need a change!`;
}

// Hat-trick Celebration: bowler takes 3 wickets in a row
export function getHatTrickText(bowlerName: string, lang: 'pa' | 'hi' | 'en'): string {
  if (lang === 'pa') return `ਹੈਟ੍ਰਿਕ! ਹੈਟ੍ਰਿਕ! ਹੈਟ੍ਰਿਕ! ${bowlerName} ਨੇ ਕਮਾਲ ਕਰ ਦਿੱਤਾ, ਲਗਾਤਾਰ ਤਿੰਨ ਗੇਂਦਾਂ ਤੇ ਤਿੰਨ ਵਿਕਟਾਂ! ਕੀ ਸ਼ਾਨਦਾਰ ਸਪੈੱਲ ਹੈ!`;
  if (lang === 'hi') return `हैट्रिक! हैट्रिक! हैट्रिक! ${bowlerName} ने कमाल कर दिया, लगातार तीन गेंदों पर तीन विकेट! क्या शानदार स्पेल है!`;
  return `Hat-trick! Hat-trick! Hat-trick! ${bowlerName} has done the incredible, three wickets in three balls! What a magical spell!`;
}

// Maiden Over Special Announcement
export function getMaidenOverText(bowlerName: string, lang: 'pa' | 'hi' | 'en'): string {
  if (lang === 'pa') return `ਕਿਆ ਬੋਲਿੰਗ ਕੀਤੀ ਹੈ, ${bowlerName} ਨੇ ਮੇਡਨ ਓਵਰ ਪਾ ਕੇ ਕਮਾਲ ਕਰ ਦਿੱਤਾ!`;
  if (lang === 'hi') return `क्या बोलिंग की है, ${bowlerName} ने मेडन ओवर डालकर कमाल कर दिया!`;
  return `What a spell of bowling! ${bowlerName} delivers a brilliant maiden over!`;
}
