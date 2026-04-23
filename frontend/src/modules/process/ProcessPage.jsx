import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

// Canonical source document — the team's Complete Design Process write-up.
// Link is surfaced in the hero + footer so readers who want to cite
// specific pages can grab the Google Doc.
const DOC_URL = 'https://docs.google.com/document/d/1T7RitOFq9XrOsDmzFAWot2PHGZOjHHoNOY-RF5ZQuzk/edit?tab=t.0'

// ---------------------------------------------------------------------------
// Hooks + primitives

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  return reduced
}

function MaskedText({ text, className = '', delay = 0, as: Tag = 'p' }) {
  const words = text.split(' ')
  return (
    <Tag className={className}>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: EASE, delay: delay + i * 0.028 }}
          className="inline-block whitespace-pre"
        >
          {w}{i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </Tag>
  )
}

function RevealBlock({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function Cite({ label, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open source: ${label}`}
      className="inline-flex items-center gap-0.5 text-emerald-700 hover:text-emerald-900 underline decoration-emerald-300 underline-offset-2 hover:decoration-emerald-700 transition-colors break-words"
    >
      {label}
      <span className="material-symbols-outlined text-[12px] flex-shrink-0">open_in_new</span>
    </a>
  )
}

function StatCallout({ value, label, tone = 'emerald' }) {
  const tones = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber:   'bg-amber-50 border-amber-200 text-amber-900',
    slate:   'bg-slate-50 border-slate-200 text-slate-900',
  }
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="text-2xl md:text-3xl font-extrabold font-headline tracking-tight leading-none">
        {value}
      </div>
      <p className="text-xs md:text-[13px] mt-1.5 leading-snug opacity-85">
        {label}
      </p>
    </div>
  )
}

function SectionHeading({ id, kicker, title, subtitle }) {
  return (
    <div id={id} className="scroll-mt-24 mb-6">
      {kicker && (
        <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 font-bold mb-2">
          {kicker}
        </p>
      )}
      <h2 className="text-2xl md:text-3xl font-extrabold font-headline tracking-tight text-emerald-900 leading-tight mb-2">
        {title}
      </h2>
      {subtitle && (
        <p className="text-on-surface-variant leading-relaxed max-w-3xl">
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Collapsible card (native <details>/<summary> for baseline accessibility)

function CollapsibleCard({ id, letter, title, children, defaultOpen = false }) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className="group rounded-3xl bg-surface-container-lowest border border-emerald-100 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_1px_3px_rgba(16,185,129,0.06)] overflow-hidden scroll-mt-24"
    >
      <summary className="flex items-start gap-4 p-6 cursor-pointer select-none list-none marker:hidden">
        <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-black font-headline">
          {letter}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-extrabold font-headline text-on-surface tracking-tight leading-tight">
            {title}
          </h3>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180 flex-shrink-0 mt-1">
          expand_more
        </span>
      </summary>
      <div className="px-6 pb-6 pt-0 space-y-4">
        {children}
      </div>
    </details>
  )
}

function Subsection({ title, children }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-bold mb-2">
        {title}
      </p>
      <div className="space-y-1.5 text-sm text-on-surface leading-relaxed">
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data — content pulled verbatim from the Complete Design Process document

const BARRIERS = [
  {
    id: 'barrier-diet',
    letter: 'A',
    title: 'Diet Quality',
    findings: [
      'Non-compliance with dietary guidelines remains widespread across age groups, with some trend projections suggesting further deterioration in key dietary outcomes by 2030.',
      'This pattern is not limited to one specific demographic.',
    ],
    implications: [
      'Barriers to healthy eating may be broader than individual motivation or knowledge.',
      'Interventions targeting a single group or a single cause may have limited population-level impact.',
    ],
    evidence: [
      {
        text: 'Nearly all Australians (99%) aged 2 to 18, and 9 in 10 adults aged 19 and over do not eat enough vegetables. About one third of Australians\' energy comes from discretionary foods, highest for teenagers aged 14 to 18 at 41%.',
        source: 'AIHW',
        url: 'https://www.aihw.gov.au/reports-data/behaviours-risk-factors/food-nutrition/overview',
      },
      {
        text: 'Only 4.2% of adults and 4.3% of children met both fruit and vegetable recommendations in 2022, a decrease from 5.4% and 6.0% respectively in 2017 to 2018.',
        source: 'ABS, Dietary Behaviour 2022',
        url: 'https://www.abs.gov.au/statistics/health/food-and-nutrition/dietary-behaviour/latest-release',
      },
      {
        text: 'Based on self-reported intake data from 275,170 Australian adults collected between 2015 and 2023, fruit intake is projected to decrease by 9.7% and discretionary food intake to increase by 18.3% by 2030. Without significant intervention, Australia is unlikely to meet its preventive health dietary targets.',
        source: 'Ryan et al. (2025), Australian and New Zealand Journal of Public Health',
        url: 'https://www.sciencedirect.com/science/article/pii/S1326020025000044',
      },
      {
        text: 'Discretionary foods contributed just under one third (31.3%) of average daily energy intake in 2023, a decrease from 35.4% in 2011 to 2012. Free sugar intake averaged 8.2% of energy intake, within the WHO recommended threshold of under 10%.',
        source: 'ABS, Food and Nutrients 2023',
        url: 'https://www.abs.gov.au/statistics/health/food-and-nutrition/food-and-nutrients/latest-release',
      },
    ],
  },
  {
    id: 'barrier-finance',
    letter: 'B',
    title: 'Financial Barriers and Food Affordability',
    findings: [
      'Financial pressure appears to be a significant barrier to healthy eating for a large portion of the Australian population, particularly among low-income and welfare-dependent households.',
      'Low-income households, single-parent families, and welfare-dependent households appear most affected.',
      'The relative price increase of healthy foods in recent years, linked to the pandemic, climate events, and international conflicts, may have made affordability challenges worse.',
    ],
    implications: [
      'For some households, food insecurity rather than food choice may be the primary issue.',
      'These are different problems and may require different responses.',
    ],
    evidence: [
      {
        text: 'In 2024, 32% of Australian households experienced either moderate or severe food insecurity in the past 12 months. 48% of households earning below $30,000 annually reported food insecurity, up 5 percentage points from 2022. Single-parent households reported a food insecurity rate of 69%, with 41% experiencing severe food insecurity.',
        source: 'Foodbank, Hunger Report 2024',
        url: 'https://reports.foodbank.org.au/wp-content/uploads/2024/10/2024_Foodbank_Hunger_Report_IPSOS-Report.pdf',
      },
      {
        text: 'A 2025 University of Wollongong article by Katherine Kent identifies financial pressure as the main driver of food insecurity in Australia, arguing that housing and energy costs reduce the share of household income available for food, which is often treated as the most adjustable part of the budget. The article notes that households may respond by buying cheaper and less nutritious food, skipping meals, or relying on food charities.',
        source: 'Kent, K. (2025), University of Wollongong',
        url: 'https://www.uow.edu.au/media/2025/1-in-8-households-dont-have-the-money-to-buy-enough-food.php',
      },
      {
        text: 'In a 2024 study of six reference welfare-dependent households in Greater Brisbane, households with children needed to spend 23% to 37% of their income on a recommended healthy diet in April 2023. After welfare changes introduced in September 2023, this fell only to 20% to 35%, leaving many households still within or above the thresholds for food stress or unaffordability.',
        source: 'Lewis, Nash and Lee (2024), Nutrients',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10935407/',
      },
      {
        text: 'Households across socioeconomic and geographic areas in Australia are driven by the current food environment to spend the majority of their food budget, around 60%, on unhealthy food and drinks, though this figure varies by location.',
        source: 'Australia\'s Food Environment Dashboard',
        url: 'https://foodenvironmentdashboard.com.au/food-prices-and-affordability/',
      },
      {
        text: 'Many healthy foods appear to have increased in price at almost double the rate of discretionary foods in recent years, amid pressures linked to the COVID-19 pandemic, climate events, and international conflicts. Food prices peaked in December 2022, with an average shopping basket costing 9.2% more than in 2021.',
        source: 'Backholer, K. and Zorbas, C. (2024), Deakin Institute for Health Transformation',
        url: 'https://iht.deakin.edu.au/2024/03/food-price-crisis/',
      },
    ],
  },
  {
    id: 'barrier-socioeconomic',
    letter: 'C',
    title: 'Socioeconomic Gradient in Diet Quality',
    findings: [
      'Access to healthy food is not equally distributed across the Australian population.',
      'Income, education, geography, and cultural background all appear to be associated with diet quality, and this appears to be an enduring structural pattern rather than a recent or isolated condition.',
    ],
    implications: [
      'Interventions may not equally reach or benefit all population groups.',
      'Socioeconomic context may need to be considered in both the design and targeting of any project.',
    ],
    evidence: [
      {
        text: 'Diet quality and associated health outcomes follow a social gradient in Australia. Australians in the highest income groups, with higher levels of education, and living in more advantaged neighbourhoods are more likely to eat a healthy and balanced diet. Indigenous Australians, minority cultural groups, people living with disabilities, and those in remote or socioeconomically disadvantaged areas are less likely to buy or consume healthy food.',
        source: 'Friel, Hattersley and Ford (2015), VicHealth Evidence Review',
        url: 'https://www.vichealth.vic.gov.au/sites/default/files/HealthEquity-Healthy-eating-review.pdf',
      },
      {
        text: 'Around 23.2% of households in the lowest income bracket experience food insecurity, compared with 3.6% in the highest. Aboriginal and Torres Strait Islander households report a food insecurity rate of 41%.',
        source: 'Kent, K. (2025), University of Wollongong',
        url: 'https://www.uow.edu.au/media/2025/1-in-8-households-dont-have-the-money-to-buy-enough-food.php',
      },
    ],
  },
  {
    id: 'barrier-time',
    letter: 'D',
    title: 'Time, Convenience, and Cooking as Barriers',
    findings: [
      'Time and money are consistently reported as barriers to cooking among Australian adults, with time pressure appearing to ease when circumstances allow more flexibility.',
      'The cognitive and emotional load of meal planning, deciding what to cook, and preparing meals is a recurring challenge, particularly for families with young children.',
      'Fathers and other household members are often less involved in meal-related tasks, partly due to limited time and cooking skills.',
    ],
    implications: [
      'Interventions that add steps or complexity to food preparation may face adoption challenges.',
      'Reducing decision-making load around meals, not just providing nutritional information, may be a more effective design direction.',
      'Tools or services that help with planning and preparation may have broader appeal than those focused purely on nutrition knowledge.',
    ],
    evidence: [
      {
        text: 'A nationally representative survey of 4,022 Australian adults measured time and money as self-reported barriers to cooking, using the items "I didn\'t have time to cook" and "I didn\'t have funds for the foods or ingredients I needed." During the first COVID-19 lockdown in Australia, time barriers decreased significantly, while money barriers did not change significantly overall.',
        source: 'Palu et al. (2024), Nutrition and Dietetics',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12168053/',
      },
      {
        text: 'In an Australian qualitative study of 25 parents, meal kit subscription services were described as helping families manage time pressures and mental load around meal planning and preparation, particularly by reducing the need to decide what to cook each evening.',
        source: 'Fraser et al. (2025), Health Promotion International',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12235520/',
      },
      {
        text: 'An Australian qualitative study found that parents reported time, energy, and mental capacity as barriers to involving children in meal preparation. The article also notes that other Australian research suggests fathers are often less involved in family meal-related tasks, partly due to limited time and cooking skills.',
        source: 'Fraser et al. (2025), Health Promotion International',
        url: 'https://academic.oup.com/heapro/article/40/4/daaf105/8192589',
      },
    ],
  },
  {
    id: 'barrier-literacy',
    letter: 'E',
    title: 'Food Literacy and Cooking Confidence',
    findings: [
      'Lower food literacy among Australian adults has been associated with lower cooking confidence, more negative attitudes about the cost of healthy foods, and poorer dietary outcomes including lower fruit and vegetable intake and higher discretionary food consumption.',
      'Limited cooking skills and food preparation knowledge appear as recurring barriers to healthy eating, including among people who are motivated to eat well.',
      'Social stigma around food insecurity may act as a barrier to accessing available support, even among households in significant need.',
    ],
    implications: [
      'Building practical cooking skills and confidence may be a more effective lever for improving dietary behaviour than providing nutritional information alone.',
      'Interventions that address shame and stigma alongside practical skills may reach people who would otherwise not seek help.',
      'Designing tools that reduce the perceived difficulty or cost of healthy cooking may be more impactful than approaches focused purely on nutritional knowledge.',
    ],
    evidence: [
      {
        text: 'Lower food literacy among Australian adults has been associated with lower self-rated cooking skills, more negative attitudes about the cost of healthy foods, lower fruit and vegetable intake, and higher discretionary food consumption.',
        source: 'Rees et al. (2022), Frontiers in Nutrition',
        url: 'https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2022.802940/full',
      },
      {
        text: 'A qualitative study of 22 young Australians found that low food literacy and limited cooking skills were reported as barriers to healthy eating, even among participants who expressed motivation to improve their diet.',
        source: 'Ronto et al. (2022), Public Health Nutrition',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9991849/',
      },
      {
        text: 'Among food-insecure Australian households, nearly half (48%) cited feelings of embarrassment and shame as the main barrier to seeking formal food relief.',
        source: 'Foodbank, Hunger Report 2024 (Ipsos)',
        url: 'https://reports.foodbank.org.au/wp-content/uploads/2024/10/2024_Foodbank_Hunger_Report_IPSOS-Report.pdf',
      },
    ],
  },
  {
    id: 'barrier-gap',
    letter: 'F',
    title: 'The Gap Between Intention and Behaviour',
    findings: [
      'Time and money are reported as important barriers to cooking among Australian adults, with time-related barriers decreasing when daily schedules became more flexible during lockdown.',
      'The cognitive and emotional load of meal planning, deciding what to cook, and preparing meals appears to be a recurring challenge, particularly for families with young children.',
      'Australian research discussed in the study suggests fathers are often less involved in family meal-related tasks, partly due to limited time and cooking skills.',
    ],
    implications: [
      'Interventions that add steps or complexity to food preparation may face adoption challenges.',
      'Reducing decision-making load around meals, rather than only providing nutritional information, may be a more effective design direction.',
      'Tools or services that support planning and preparation may be more practical in everyday life than approaches focused purely on nutrition knowledge.',
    ],
    evidence: [
      {
        text: 'Without significant intervention, Australia is unlikely to meet its 2030 preventive health dietary targets. Modelling based on data from 275,170 adults suggests that by 2030, fruit intake will decline by 9.7%, discretionary food intake will increase by 18.3%, and vegetable intake will remain stable but still well below target levels.',
        source: 'Ryan, Baird and Hendrie (2025), Australian and New Zealand Journal of Public Health',
        url: 'https://www.sciencedirect.com/article/pii/S1326020025000044',
      },
      {
        text: 'Among food-insecure Australian households, meal planning ahead of time and reducing spending on eating out were among the most commonly reported strategies used to manage cost-of-living pressures.',
        source: 'Foodbank, Hunger Report 2024 (Ipsos)',
        url: 'https://reports.foodbank.org.au/wp-content/uploads/2024/10/2024_Foodbank_Hunger_Report_IPSOS-Report.pdf',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Broad Lotus Blossom (9×9) — 8 themes around a central challenge. Rendered
// as a wide table with horizontal scroll on narrow viewports.

const BROAD_LOTUS = [
  [
    { t: 'Lower food literacy linked to worse dietary outcomes' },
    { t: 'Limited cooking skills a barrier even among motivated individuals' },
    { t: 'Limited cooking confidence can reduce willingness to cook' },
    { t: 'Stigma prevents many households from seeking food relief' },
    { t: 'High rates of household food insecurity across Australia' },
    { t: 'Low-income households disproportionately affected' },
    { t: 'Fresh produce prices have risen faster than discretionary food prices' },
    { t: 'Affordability challenges have worsened since the pandemic' },
    { t: 'Healthy food affordability' },
  ],
  [
    { t: 'Food literacy gaps persist across age groups and education levels' },
    { t: 'Cooking Skills and Food Literacy', theme: true },
    { t: 'Young Australians report gaps in food preparation skills' },
    { t: 'Cheaper, less nutritious food used as a coping strategy' },
    { t: 'Food Insecurity', theme: true },
    { t: 'Single parent households among the most food insecure' },
    { t: 'Cost trade-offs force choices between nutrition and quantity' },
    { t: 'Cost and Affordability', theme: true },
    { t: 'Food prices have risen significantly in recent years' },
  ],
  [
    { t: 'Those with lowest confidence benefit most from skills interventions' },
    { t: 'Higher food literacy associated with healthier food choices' },
    { t: 'Cooking programs may improve confidence though behaviour change can be limited' },
    { t: 'Food insecurity is both a cause and consequence of poor health' },
    { t: 'Skipping meals and cutting meal sizes are common responses' },
    { t: 'Aboriginal and Torres Strait Islander households at elevated risk' },
    { t: 'Single parents face the highest rates of food-related financial stress' },
    { t: 'Welfare-dependent households have a high proportion of income on food' },
    { t: 'Food spending is shaped by an environment that favours unhealthy options' },
  ],
  [
    { t: 'Time is a key self-reported barrier to cooking' },
    { t: 'Evening meals can become a recurring stress point for families' },
    { t: 'Convenience foods fill the gap left by limited time' },
    { t: 'Cooking Skills and Food Literacy', theme: true },
    { t: 'Food Insecurity', theme: true },
    { t: 'Cost and Affordability', theme: true },
    { t: 'Meal-related mental load often falls more heavily on mothers' },
    { t: 'Deciding what to cook is a major daily stressor for parents' },
    { t: 'Meal kits reduce decision-making pressure around dinner' },
  ],
  [
    { t: 'Advance preparation reduces pressure at mealtimes' },
    { t: 'Time and Convenience', theme: true },
    { t: 'Meal planning can reduce time pressure when adopted' },
    { t: 'Time and Convenience', theme: true },
    { t: 'Responsible and Healthy Food Consumption', centre: true },
    { t: 'Mental Load and Decision Fatigue', theme: true },
    { t: 'Fathers less involved in meal tasks partly due to limited time and skills' },
    { t: 'Mental Load and Decision Fatigue', theme: true },
    { t: 'Planning, selecting, and preparing meals require sustained effort' },
  ],
  [
    { t: 'Money barriers to cooking remain even when time barriers ease' },
    { t: 'Time barriers decrease when daily schedules become flexible' },
    { t: 'Meal kit services appeal partly due to time efficiency' },
    { t: 'Socioeconomic and Structural Inequality', theme: true },
    { t: 'Access and Food Environment', theme: true },
    { t: 'Motivation and Behaviour Change', theme: true },
    { t: 'Reducing cognitive load around meals may support better food choices' },
    { t: 'Simple meal guidance may reduce perceived effort for low-confidence cooks' },
    { t: 'Decision fatigue contributes to reliance on convenience and takeaway' },
  ],
  [
    { t: 'Diet quality follows a clear social gradient in Australia' },
    { t: 'Income, education, and geography all associated with dietary outcomes' },
    { t: 'Indigenous Australians and minority groups disproportionately affected' },
    { t: 'Food relief organisations increasingly essential for vulnerable households' },
    { t: 'Geographic location affects access to affordable healthy food' },
    { t: 'Disadvantaged areas have limited access to healthy options' },
    { t: 'Dietary guidelines have long been publicly available' },
    { t: 'Awareness alone does not drive behaviour change' },
    { t: 'Poor dietary outcomes persist despite public health messaging' },
  ],
  [
    { t: 'Regional and remote households face compounding disadvantage' },
    { t: 'Socioeconomic and Structural Inequality', theme: true },
    { t: 'People with disabilities may face greater barriers to accessing healthy food' },
    { t: 'Digital food retail may expand access but not equally across populations' },
    { t: 'Access and Food Environment', theme: true },
    { t: 'Food environments can make healthy choices harder to act on', emphasis: true },
    { t: 'Young Australians motivated but face practical barriers' },
    { t: 'Motivation and Behaviour Change', theme: true },
    { t: 'Dietary trends projected to worsen without significant intervention' },
  ],
  [
    { t: 'Structural inequality limits the reach of individual interventions' },
    { t: 'Digital interventions may widen the gap rather than close it' },
    { t: 'Systemic change needed alongside individual behaviour change approaches' },
    { t: 'Local food infrastructure shapes dietary choices regardless of intention' },
    { t: 'Food environments can make healthy choices harder to act on' },
    { t: 'Regional and remote households face higher food prices' },
    { t: 'Individual motivation is necessary but not sufficient for dietary change' },
    { t: 'Social and environmental factors shape food choices alongside knowledge' },
    { t: 'Behaviour change requires reducing friction, not just adding information' },
  ],
]

// Focused Lotus Blossom (9×9) — zoom into budget-constrained healthy eating
// among food-insecure households.

const FOCUSED_LOTUS = [
  [
    { t: 'Fresh food spoils quickly' },
    { t: 'Incomplete ingredients for recipes' },
    { t: 'Limited pantry variety' },
    { t: 'Trade-offs between short-term survival and long-term health' },
    { t: 'Cheaper foods are often less nutritious' },
    { t: 'Healthy options may feel financially risky' },
    { t: 'Low capacity to plan ahead consistently' },
    { t: 'Planning meals with a very small budget' },
    { t: 'Uncertainty about what food will last' },
  ],
  [
    { t: 'Inconsistent access to affordable staples' },
    { t: 'Limited Ingredients and Food Availability', theme: true },
    { t: 'Working with whatever food is available' },
    { t: 'Healthy eating perceived as expensive' },
    { t: 'Low-Cost Nutrition Trade-Offs', theme: true },
    { t: 'Nutrition sacrificed for fullness' },
    { t: 'Plans disrupted by changing prices or shortages' },
    { t: 'Meal Planning Under Pressure', theme: true },
    { t: 'Difficulty planning across the full week' },
  ],
  [
    { t: 'Local stores may have limited healthy options' },
    { t: 'Reliance on what is discounted' },
    { t: 'Difficulty making meals from partial ingredients' },
    { t: 'Difficulty comparing cost versus nutrition' },
    { t: 'Processed foods seen as better value' },
    { t: 'Prioritising calories over balance' },
    { t: 'Mental effort of repeated budget decisions' },
    { t: 'Trouble balancing variety and affordability' },
    { t: 'Need to stretch ingredients across multiple meals' },
  ],
  [
    { t: 'Difficulty adapting recipes to available ingredients' },
    { t: 'Limited knowledge of cheap nutritious meals' },
    { t: 'Low confidence in basic cooking' },
    { t: 'Limited Ingredients and Food Availability', theme: true },
    { t: 'Low-Cost Nutrition Trade-Offs', theme: true },
    { t: 'Meal Planning Under Pressure', theme: true },
    { t: 'Limited flexibility for unexpected costs' },
    { t: 'Constant pressure to minimise spending' },
    { t: 'Irregular or limited household income' },
  ],
  [
    { t: 'Uncertainty about portioning and stretching meals' },
    { t: 'Cooking Confidence and Food Literacy', theme: true },
    { t: 'Cooking seen as effortful or intimidating' },
    { t: 'Cooking Confidence and Food Literacy', theme: true },
    { t: 'Helping Food-Insecure Households Make Affordable Food Decisions', centre: true },
    { t: 'Budget Constraints', theme: true },
    { t: 'Need to prioritise quantity over quality' },
    { t: 'Budget Constraints', theme: true },
    { t: 'Rising grocery prices' },
  ],
  [
    { t: 'Limited skills in food storage and leftovers' },
    { t: 'Low confidence in making healthy substitutions' },
    { t: 'Practical skills gap despite motivation to eat better' },
    { t: 'Time Pressure and Convenience', theme: true },
    { t: 'Access to Support and Food Relief', theme: true },
    { t: 'Stigma and Help-Seeking Barriers', theme: true },
    { t: 'Competing expenses like rent and bills' },
    { t: 'Food budget runs out early' },
    { t: 'High cost of fresh produce' },
  ],
  [
    { t: 'Convenience foods used to save time' },
    { t: 'Exhaustion after work or caregiving' },
    { t: 'Limited time to shop and cook' },
    { t: 'Limited awareness of available programs' },
    { t: 'Unclear eligibility for assistance' },
    { t: 'Difficulty finding nearby support services' },
    { t: 'Fear of being judged by others' },
    { t: 'Shame linked to food relief' },
    { t: 'Embarrassment about needing help' },
  ],
  [
    { t: 'Little time for batch cooking' },
    { t: 'Time Pressure and Convenience', theme: true },
    { t: 'Time pressure increases reliance on familiar options' },
    { t: 'Inconvenient service locations or hours' },
    { t: 'Access to Support and Food Relief', theme: true },
    { t: 'Support options may not match household needs' },
    { t: 'Reluctance to ask for support' },
    { t: 'Stigma and Help-Seeking Barriers', theme: true },
    { t: 'Emotional stress around food hardship' },
  ],
  [
    { t: 'Busy schedules reduce planning capacity' },
    { t: 'Quick decisions replace thoughtful choices' },
    { t: 'Affordable meals may still feel too time-intensive' },
    { t: 'Transport barriers to food access' },
    { t: 'Gaps between knowing and using services' },
    { t: 'Reliance on charities during crisis periods' },
    { t: 'Desire to appear self-sufficient' },
    { t: 'Delayed help-seeking until situations worsen' },
    { t: 'Avoidance of visible charity-based support' },
  ],
]

function LotusGrid({ rows }) {
  return (
    <div className="overflow-x-auto -mx-6 px-6 pb-2">
      <table className="w-full border-separate border-spacing-1 min-w-[880px]">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                let cls =
                  'p-2.5 text-[10.5px] leading-tight rounded-md align-middle text-on-surface bg-surface-container-low border border-outline-variant/20'
                if (cell.theme) {
                  cls = 'p-2.5 text-[11px] leading-tight rounded-md align-middle font-bold text-emerald-900 bg-emerald-100/80 border border-emerald-200'
                }
                if (cell.centre) {
                  cls = 'p-2.5 text-[11px] leading-tight rounded-md align-middle font-extrabold text-white bg-emerald-700 border border-emerald-800'
                }
                if (cell.emphasis) {
                  cls = 'p-2.5 text-[10.5px] leading-tight rounded-md align-middle text-red-900 bg-red-50 border border-red-200'
                }
                return (
                  <td key={ci} className={cls} style={{ width: `${100 / 9}%`, minWidth: 90 }}>
                    {cell.t}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-on-surface-variant italic">
        Scroll horizontally on smaller screens to see the full 9 × 9 grid. Dark emerald cells mark the central challenge; light emerald cells mark the 8 surrounding themes.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// News articles

const NEWS_ARTICLES = [
  {
    title: 'Budget constraints and food cost trade-offs',
    body: 'Recent reporting on food insecurity in Australia suggests that many households are not simply choosing between healthy and unhealthy food, but are struggling to afford enough food at all. Rising living costs, especially for renters, single-parent households, and households including a person with disability, appear to be intensifying these pressures. This reinforces our earlier research finding that for many households, the issue is not only food choice but financial survival.',
    source: 'SBS News (November 2025)',
    url: 'https://www.sbs.com.au/news/article/food-insecurity-worsening-in-australia-according-to-foodbank/w2sediuu0',
  },
  {
    title: 'Meal planning and decision-making under pressure',
    body: 'Nearly two thirds of Australians surveyed report experiencing decision fatigue when it comes to meal planning, including feeling overwhelmed or stressed by the process. More than one in five admit they often avoid meal planning altogether due to the stress it causes, and almost half say it is because of the sheer number of tasks involved, from finding recipes to making shopping lists.',
    source: 'MyFitnessPal research reported by News Hub (May 2025)',
    url: 'https://newshub.medianet.com.au/2025/05/too-tired-to-plan-too-busy-to-cook-meal-planning-decision-fatigue-impacting-aussie-households/101872/',
  },
  {
    title: 'Cooking confidence and using low-cost ingredients practically',
    body: 'A further issue emerging from the articles is the gap between grocery spending and the practical ability to turn affordable ingredients into realistic, healthy meals. Even where lower-cost options exist, households may still need planning skills, ingredient knowledge, and basic cooking capability to make those options workable in everyday life. This aligns with our earlier research suggesting that food literacy and cooking skills can affect people\'s ability to act on healthy intentions under constraint.',
    source: 'Farletti, R. (2025), Health and Wellbeing Queensland, 21 August',
    url: 'https://hw.qld.gov.au/blog/eating-well-on-a-budget-how-aussie-families-can-reduce-their-grocery-costs-and-improve-their-health-and-wellbeing/',
  },
]

// ---------------------------------------------------------------------------
// Persona + empathy map

const PERSONA = {
  name: 'Sarah',
  age: 'Early 30s',
  location: 'Urban Australia',
  household: 'Single parent with young children',
  income: 'Low-income, financially constrained',
  housing: 'Renting',
  background:
    'Sarah is a single parent who manages most household food decisions on a limited budget. After paying for rent, bills, and essentials, she has little flexibility left for groceries. She is not always in immediate crisis, but regularly experiences financial pressure that affects what food she can buy, plan, and prepare.',
  goals: [
    'Feed her household affordable meals that are filling and reasonably nutritious',
    'Make groceries last across the week or fortnight',
    'Reduce food waste and make better use of available ingredients',
    'Feel more confident and in control of meal decisions',
  ],
  barriers: [
    'Tight budget limits food options and increases trade-offs between cost, quantity, and nutrition',
    'Meal planning is difficult under financial stress and low mental bandwidth',
    'Limited cooking confidence makes it harder to adapt meals to what is available or affordable',
    'Time pressure and caregiving make daily food decisions more stressful',
    'Embarrassment and stigma can make formal support harder to access',
  ],
  behaviours: [
    'Looks for discounts, specials, and lower-cost options',
    'Repeats familiar meals because they feel safer and less risky',
    'Tries to plan ahead when possible, but cannot always do so consistently',
    'May reduce spending on eating out and try to stretch ingredients across multiple meals',
  ],
  frustrations: [
    'Healthy eating often feels harder to maintain than it should',
    'Cheap food options can be less nutritious or less flexible',
    'Planning meals takes energy she does not always have',
    'Most food advice assumes more time, money, and choice than she actually has',
  ],
}

const EMPATHY = {
  think: [
    'Worried about whether the groceries will last until the next payment cycle',
    'Feels pressure to keep her children fed, full, and reasonably healthy',
    'Stressed about making the wrong food choices when money is tight',
    'Feels guilty when she cannot provide more variety or fresher food',
    'Wants to do better but feels stuck repeating the same low-cost meals',
  ],
  hear: [
    'Advice like "just meal prep" or "buy in bulk" which assumes more money and time than she has',
    'Children asking for foods or snacks she cannot always afford',
    'News and social media constantly talking about rising grocery prices',
    'General messages that healthy eating requires more planning, time, and money',
    'Comments from others that make budgeting for food sound easier than it really is',
  ],
  see: [
    'Supermarket shelves where cheaper processed foods feel more realistic than fresh ingredients',
    'Specials and discount labels that shape what she buys each week',
    'Recipes online that use too many ingredients or assume too much time',
    'Other families seeming more in control of meals, lunchboxes, and grocery shopping',
    'Food support services that feel difficult or uncomfortable to access',
  ],
  sayDo: [
    'Compares unit prices and looks for specials',
    'Repeats familiar low-cost recipes',
    'Cooks in bulk when she can manage it',
    'Cuts eating-out and discretionary spending first when things get tight',
    'Avoids visible charity-based support even when struggling',
  ],
  pain: [
    'Budget runs out before the end of the week or fortnight',
    'Constant trade-offs between cost, quantity, and nutrition',
    'Meal decisions feel mentally exhausting after a full day of caregiving',
    'Fresh food can spoil before it is fully used',
    'Feels embarrassed about needing support',
  ],
  gain: [
    'Making groceries last without constant stress',
    'Finding affordable meals her children will actually eat',
    'Feeling more confident using low-cost ingredients in practical ways',
    'Spending less time deciding what to cook each day',
    'Feeling more in control and less judged about her food situation',
  ],
}

// Sponsors

const SPONSORS = [
  {
    name: 'Food Bank (Victoria)',
    purpose: null,
    detail: '441–459 Kororoit Creek Rd, Altona 3018 · 03 9362 8300 · info@foodbankvictoria.org.au',
  },
  {
    name: 'Department of Social Services',
    purpose: 'To improve the economic and social wellbeing of individuals, families and vulnerable members of Australian communities.',
    detail: 'Levels 10 and Part 11, 180 Lonsdale Street, Melbourne VIC 3000 · Enquiries@dss.gov.au',
  },
  {
    name: 'Nutrition Australia',
    purpose: null,
    detail: 'National nutrition advocacy body.',
  },
  {
    name: 'Woolworths',
    purpose: 'To provide customers with affordable and accessible grocery options across Australia.',
    detail: 'Partnership would grant access to weekly half-price specials data, used to automatically generate budget-based meal suggestions and shopping lists within the app.',
  },
  {
    name: 'Coles',
    purpose: 'To make quality food and groceries accessible and affordable for all Australians.',
    detail: 'Partnership would grant access to weekly specials and discount catalogue data, integrated alongside Woolworths data to give users a broader range of affordable ingredient options when planning meals.',
  },
]

// Solution directions (10 items, categorised)

const SOLUTION_CATEGORIES = [
  {
    label: 'Planning-focused',
    items: [
      { title: 'Affordable healthy meal planning under budget pressure', body: 'App uses budget, nutrition, and ingredient data to suggest realistic low-cost meals for the week.' },
      { title: 'Fortnight budget food planner', body: 'App helps users plan meals and spending across a full payment cycle, not just day to day.' },
      { title: 'Smart grocery basket builder', body: 'App creates a low-cost shopping list based on user budget, household size, and simple meal needs.' },
    ],
  },
  {
    label: 'Decision-support focused',
    items: [
      { title: 'Budget-aware food decision support', body: 'App compares food options by cost, nutrition, and quantity so users can make better trade-offs quickly.' },
      { title: 'Cheap ingredient substitution tool', body: 'App recommends lower-cost substitutes when ingredients are too expensive or unavailable.' },
      { title: 'Low-effort meal decision assistant', body: 'App reduces decision fatigue by giving a few practical meal options based on budget, time, and available ingredients.' },
    ],
  },
  {
    label: 'Access / support focused',
    items: [
      { title: 'Food support access and navigation', body: 'App helps users find food relief, community kitchens, vouchers, and nearby support services with less friction.' },
      { title: 'Healthy-on-specials recommender', body: 'App uses supermarket specials and discounts to suggest affordable meal combinations.' },
      { title: 'Pantry-to-meal planner', body: 'App suggests meals based on ingredients the user already has, helping stretch food further and reduce waste.' },
    ],
  },
  {
    label: 'Capability-building focused',
    items: [
      { title: 'Confidence-building cooking support', body: 'App focuses on simple low-cost recipes, step-by-step guidance, and flexible meal options for users with low cooking confidence.' },
    ],
  },
]

// Full 18-feature roster — pulled verbatim from the Key Features section of
// the Complete Design Process document.

const KEY_FEATURES = [
  { n: 1,  title: 'Personalised budget-based meal planning', body: 'Users can enter a weekly or fortnightly food budget and receive meal suggestions that fit within that limit. Rather than simply showing "cheap recipes," the system would generate meal plans that reflect the user\'s actual financial constraint, household size, and likely consumption pattern.' },
  { n: 2,  title: 'Intelligent meal recommendation engine', body: 'The application would include a recommendation layer that ranks meals based on multiple factors, including affordability, nutrition, preparation effort, ingredient overlap, cooking confidence, and time available. This would help users quickly identify meals that are not only low-cost, but also realistic for their situation.' },
  { n: 3,  title: 'Fortnight-cycle food planning', body: 'Because many financially constrained households budget around payment cycles rather than ideal weekly planning, the app would support planning across a full week or fortnight. This would help users distribute grocery spending more strategically and reduce the risk of running out of food budget before the next payment period.' },
  { n: 4,  title: 'Pantry-to-meal functionality', body: 'Users could enter ingredients they already have at home and receive meal suggestions based on those items. This feature would help stretch limited food supplies, make better use of existing ingredients, and reduce waste.' },
  { n: 5,  title: 'Low-cost ingredient substitution', body: 'The app would suggest lower-cost alternatives when ingredients are too expensive, unavailable, or impractical. These substitutions would aim to preserve meal usability while also maintaining reasonable nutritional value.' },
  { n: 6,  title: 'Smart grocery basket builder', body: 'After selecting meals, users could generate a consolidated shopping list organised by ingredient, quantity, and approximate cost. This would help users shop more efficiently and reduce unnecessary or duplicate spending.' },
  { n: 7,  title: 'Healthy-on-budget recommendations', body: 'Instead of separating "healthy" from "cheap," the app would identify meals that sit at the intersection of affordability, practicality, and nutrition. This is important because many existing recipe apps optimise for variety or lifestyle appeal rather than financial realism.' },
  { n: 8,  title: 'Cost–nutrition trade-off support', body: 'The system would allow users to compare meal or ingredient options based on cost, nutritional quality, and quantity. This would help users make informed trade-offs quickly rather than relying on guesswork at the point of planning or purchase.' },
  { n: 9,  title: 'Low-waste meal sequencing', body: 'The app would recommend sets of meals that intentionally reuse overlapping ingredients across multiple days. This would reduce food waste, make grocery spending more efficient, and lower the risk of fresh ingredients spoiling before they can be used.' },
  { n: 10, title: 'Specials- and discount-aware suggestions', body: 'Where data is available, the system could prioritise recipes and ingredient recommendations based on current specials, lower-cost alternatives, or discounted items. This would make the recommendations more responsive to real market conditions rather than relying only on static price assumptions.' },
  { n: 11, title: 'Low-cognitive-load design', body: 'A core feature of the app would be simplicity. Rather than overwhelming users with hundreds of recipes, filters, and options, the interface would reduce decision fatigue by narrowing choices and surfacing only the most relevant recommendations. This is especially important for users making food decisions under financial and mental strain.' },
  { n: 12, title: 'Beginner-friendly cooking guidance', body: 'The app would provide simple step-by-step recipes designed for users with limited cooking confidence. Recipes would avoid unnecessary complexity and support practical cooking with flexible ingredients, affordable staples, and accessible preparation methods.' },
  { n: 13, title: 'Flexible ingredient and meal logic', body: 'Unlike conventional recipe platforms that assume fixed ingredients, the app would support flexible meal construction. This means users could swap ingredients, adjust portions, or work from partial ingredient sets without making the recipe unusable.' },
  { n: 14, title: 'Support for realistic budget-conscious foods', body: 'The system would not assume users can only cook with ideal fresh ingredients. It would treat frozen, canned, discounted, and staple foods as valid and practical options within healthy meal planning, making the app more realistic and less judgmental.' },
  { n: 15, title: 'Household-aware personalisation', body: 'Recommendations could be adjusted based on household composition, such as number of adults, number of children, dietary preferences, or available cooking time. This would make the output more relevant than generic one-size-fits-all meal plans.' },
  { n: 16, title: 'Non-judgmental communication design', body: 'The app would avoid framing users as irresponsible or unhealthy. Instead, it would provide practical, supportive guidance that acknowledges constraint, reduces shame, and treats affordability-focused decisions as valid.' },
  { n: 17, title: 'Decision-support rather than recipe browsing', body: 'A key feature of the system is that it functions as a decision-support tool, not just a recipe library. Its purpose is to help users answer practical questions such as: What can I cook this week within my budget? What can I make from what I already have? What is a cheaper substitute for this ingredient? Which meals give the best balance of price, nutrition, and effort?' },
  { n: 18, title: 'Optional support escalation pathway', body: 'Although the main focus is everyday food decision-making, the app could include an optional pathway that directs users to food relief or community support services if their needs move beyond planning and into immediate hardship. This keeps the system relevant without making support navigation the app\'s central purpose.' },
]

// ---------------------------------------------------------------------------
// Table of contents

const TOC = [
  { id: 'barriers',      label: 'Barriers to Healthy Consumption' },
  { id: 'synthesis',     label: 'Synthesis of Research Findings' },
  { id: 'broad-lotus',   label: 'Broad Lotus Blossom' },
  { id: 'focus',         label: 'Focus Area' },
  { id: 'focused-lotus', label: 'Focused Lotus Blossom' },
  { id: 'news',          label: 'News Article Analysis' },
  { id: 'audience',      label: 'Target Audience' },
  { id: 'problem',       label: 'Problem Statement' },
  { id: 'persona',       label: 'Persona (Sarah)' },
  { id: 'empathy',       label: 'Empathy Map' },
  { id: 'sponsors',      label: 'Potential Sponsors' },
  { id: 'solutions',     label: 'Solution Directions' },
  { id: 'concept',       label: 'Concept Evaluation' },
  { id: 'features',      label: 'Key Features (18 total)' },
]

// ---------------------------------------------------------------------------
// Page

export default function ProcessPage() {
  const reduced = usePrefersReducedMotion()

  return (
    <div className="relative px-6 md:px-12 max-w-6xl mx-auto pb-24">
      {/* Atmospheric emerald backdrop — same as Roadmap */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[640px] pointer-events-none -z-10"
        style={{
          background:
            'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
        }}
      />

      {/* Hero */}
      <section className="pt-10 pb-14 md:pt-16 md:pb-16 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-emerald-100/60 border border-emerald-200/60"
        >
          <span className="material-symbols-outlined text-[14px] text-emerald-700">hub</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-800">
            Research &amp; design process
          </span>
        </motion.div>

        <h1 className="text-4xl md:text-6xl font-extrabold font-headline tracking-tight text-emerald-900 leading-[1.05] mb-5">
          {reduced ? (
            <>How we <span className="text-emerald-600">got here</span></>
          ) : (
            <>
              <MaskedText text="How we" as="span" className="block" delay={0.05} />
              <MaskedText text="got here" as="span" className="block text-emerald-600" delay={0.25} />
            </>
          )}
        </h1>

        {reduced ? (
          <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed mb-5">
            Everything on the site above is the product of the research and decisions laid out on this page. Barriers, target audience, persona, empathy map, solution directions, and the feature roster that shaped iteration 1. The team kept the full reasoning visible on purpose.
          </p>
        ) : (
          <MaskedText
            as="p"
            delay={0.45}
            className="text-lg text-on-surface-variant max-w-2xl leading-relaxed mb-5"
            text="Everything on the site above is the product of the research and decisions laid out on this page. Barriers, target audience, persona, empathy map, solution directions, and the feature roster that shaped iteration 1. The team kept the full reasoning visible on purpose."
          />
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={DOC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-900/10 hover:scale-[1.02] active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-base">description</span>
            Open the full document
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </a>
        </div>
      </section>

      {/* Table of contents */}
      <RevealBlock className="mb-14 rounded-3xl p-5 md:p-6 bg-surface-container-lowest border border-emerald-100 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 font-bold mb-3">
          On this page
        </p>
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          {TOC.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="inline-flex items-center gap-2 text-on-surface hover:text-emerald-700 transition-colors"
              >
                <span className="font-mono text-[10px] text-on-surface-variant w-5">{String(i + 1).padStart(2, '0')}</span>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </RevealBlock>

      {/* SECTION 1 — Barriers */}
      <RevealBlock className="mb-20">
        <SectionHeading
          id="barriers"
          kicker="Part one"
          title="Barriers to Responsible & Healthy Food Consumption in Australia"
          subtitle="Initial research to understand the market. Our focus in this stage was to identify the main barriers that make responsible and healthy consumption difficult in the Australian context, including cost, convenience, access, habits, food literacy, and confusion around sustainability."
        />

        {/* Stat callouts from the research */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCallout value="32%" label="of Australian households experienced moderate or severe food insecurity in 2024." />
          <StatCallout value="69%" label="food insecurity rate among single-parent households (41% severe)." />
          <StatCallout value="4.2%" label="of adults met both fruit and vegetable guidelines in 2022." tone="amber" />
          <StatCallout value="60%" label="of Australian food budgets go to unhealthy food and drink on average." tone="slate" />
        </div>

        <div className="space-y-3">
          {BARRIERS.map((b, i) => (
            <CollapsibleCard
              key={b.id}
              id={b.id}
              letter={b.letter}
              title={b.title}
              defaultOpen={i === 0}
            >
              <Subsection title="Findings">
                <ul className="list-disc list-outside pl-5 space-y-1.5">
                  {b.findings.map((f, idx) => <li key={idx}>{f}</li>)}
                </ul>
              </Subsection>
              <Subsection title="Possible implications">
                <ul className="list-disc list-outside pl-5 space-y-1.5">
                  {b.implications.map((f, idx) => <li key={idx}>{f}</li>)}
                </ul>
              </Subsection>
              <Subsection title="Evidence">
                <ul className="space-y-3">
                  {b.evidence.map((e, idx) => (
                    <li key={idx} className="rounded-2xl bg-surface-container-low p-4">
                      <p className="text-sm text-on-surface leading-relaxed mb-2">{e.text}</p>
                      <p className="text-xs text-on-surface-variant">
                        Source: <Cite label={e.source} href={e.url} />
                      </p>
                    </li>
                  ))}
                </ul>
              </Subsection>
            </CollapsibleCard>
          ))}
        </div>
      </RevealBlock>

      {/* SECTION 2 — Synthesis */}
      <RevealBlock className="mb-20">
        <SectionHeading
          id="synthesis"
          kicker="Part two"
          title="Synthesis of Research Findings"
        />
        <div className="space-y-4 text-on-surface leading-relaxed max-w-3xl">
          <p>
            Australians are not eating well, and this has been the case for a long time. Compliance with dietary guidelines is poor across all age groups, and current trends suggest the situation is more likely to worsen than improve without significant intervention. This is not a problem of awareness; dietary guidelines have existed for decades and are widely available. Something else is getting in the way.
          </p>
          <p>
            The research points to several overlapping barriers. Cost is the most immediate for a significant portion of the population. For low-income households, welfare-dependent families, and single parents, the challenge is not choosing between healthy and unhealthy food; it is having enough money to eat at all. For these households, food insecurity rather than food choice is the primary issue, and any intervention that assumes freedom of choice will miss them entirely.
          </p>
          <p>
            For households above the food insecurity threshold, the barriers shift. Time pressure, cognitive load, and limited cooking confidence appear to play a larger role. Parents in particular describe the evening meal as a recurring source of stress, where the combined demands of deciding what to cook, buying ingredients, and preparing food compete with work, childcare, and exhaustion. Meal planning and cooking skills are not universal, and lower food literacy is directly associated with worse dietary outcomes even among people who want to eat better.
          </p>
          <p>
            Cutting across all of this is a structural dimension. Diet quality follows a clear social gradient in Australia. Income, education, geography, and cultural background all shape what people eat. This means the problem cannot be solved by targeting one group or one cause. It also means that digital interventions risk reaching only those who are already better resourced.
          </p>
          <p className="font-semibold text-emerald-900">
            The gap between intention and behaviour is the thread that runs through everything. People are not indifferent to their health. They face real constraints — financial, practical, emotional, and environmental — that make acting on good intentions difficult in everyday life.
          </p>
        </div>
      </RevealBlock>

      {/* SECTION 3 — Broad lotus blossom */}
      <RevealBlock className="mb-20">
        <SectionHeading
          id="broad-lotus"
          kicker="Part three"
          title="Broad Lotus Blossom"
          subtitle="Eight themes around a central challenge: responsible and healthy food consumption. Each 3×3 block surrounding the centre contains a theme and eight sub-themes drawn from the research above."
        />
        <LotusGrid rows={BROAD_LOTUS} />
      </RevealBlock>

      {/* SECTION 4 — Focus area */}
      <RevealBlock className="mb-20">
        <SectionHeading
          id="focus"
          kicker="Part four"
          title="Focus Area"
        />
        <div className="space-y-4 text-on-surface leading-relaxed max-w-3xl">
          <p>
            From the eight themes explored in the broad Lotus Blossom, the most promising area for this project is <span className="font-bold text-emerald-900">budget-constrained healthy eating among food-insecure households</span>.
          </p>
          <p>
            <span className="font-semibold">First, it is where the evidence is strongest.</span> Financial pressure appears to be the primary driver of food insecurity in Australia, and the research shows that low-income households face compounding barriers including rising food prices, limited budgets, and a food environment that often steers spending toward unhealthy options.
          </p>
          <p>
            <span className="font-semibold">Second, it is an area where a digital tool could make a realistic difference.</span> Food-insecure households already use practical coping strategies such as meal planning and reducing discretionary spending. This suggests there are existing behaviours to support and strengthen, rather than entirely new habits to introduce.
          </p>
          <p>
            <span className="font-semibold">Third, it connects directly to several practical barriers identified across the research</span>, including time pressure, cooking confidence, decision fatigue, and stigma around seeking help.
          </p>
          <p>
            The focused Lotus Blossom below explores this area in more depth by examining the specific barriers, decision points, and unmet needs that shape how food-insecure households make food decisions under financial constraint.
          </p>
        </div>
      </RevealBlock>

      {/* SECTION 5 — Focused lotus */}
      <RevealBlock className="mb-20">
        <SectionHeading
          id="focused-lotus"
          kicker="Part five"
          title="Focused Lotus Blossom"
          subtitle="Zooming in on food-insecure households and the practical decision points that shape daily food choices under constraint."
        />
        <LotusGrid rows={FOCUSED_LOTUS} />
      </RevealBlock>

      {/* SECTION 6 — News article analysis */}
      <RevealBlock className="mb-20">
        <SectionHeading
          id="news"
          kicker="Part six"
          title="News Article Analysis"
          subtitle="To further narrow the project direction, we reviewed recent news coverage related to food insecurity and affordable healthy eating in Australia. Three themes appeared most relevant: budget constraints and food cost trade-offs, meal planning and decision-making under pressure, and cooking confidence in turning low-cost ingredients into practical meals."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {NEWS_ARTICLES.map((a, i) => (
            <motion.article
              key={a.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.42, ease: EASE, delay: i * 0.06 }}
              className="rounded-3xl p-5 md:p-6 bg-surface-container-lowest border border-emerald-100 shadow-sm flex flex-col"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-bold mb-2">
                Theme {i + 1}
              </p>
              <h3 className="text-base font-extrabold font-headline text-on-surface leading-tight mb-3">
                {a.title}
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1 mb-3">
                {a.body}
              </p>
              <p className="text-xs text-on-surface-variant">
                Source: <Cite label={a.source} href={a.url} />
              </p>
            </motion.article>
          ))}
        </div>
        <div className="mt-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-bold mb-2">This gives us room to explore</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-on-surface">
            {['Budget meal planning', 'Low-cost nutritious swaps', 'Stretching limited ingredients', 'Reducing waste', 'Comparing cost vs nutrition', 'Shopping decision support'].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </RevealBlock>

      {/* SECTION 7 — Target audience */}
      <RevealBlock className="mb-16">
        <SectionHeading
          id="audience"
          kicker="Part seven"
          title="Target Audience"
        />
        <div className="space-y-4 text-on-surface leading-relaxed max-w-3xl">
          <p>
            Our primary target audience is <span className="font-bold text-emerald-900">low-income Australian adults managing household food decisions under financial constraint, particularly those experiencing moderate food insecurity</span>.
          </p>
          <p>
            This group was selected because the research suggests they face overlapping barriers including budget pressure, meal planning difficulty, time constraints, and limited cooking confidence, while still being in a position where a practical digital tool may be useful. Unlike households experiencing the most severe forms of food insecurity, this group may still have some capacity to plan, compare, and prepare meals, but struggles to do so consistently under pressure.
          </p>
          <p>
            Within this broader audience, two groups appear especially relevant: <span className="font-semibold">single-parent households</span> and <span className="font-semibold">young adults living independently on limited income</span>. Both face strong cost pressures, limited flexibility, and practical challenges in turning a restricted food budget into realistic everyday meals.
          </p>
        </div>
      </RevealBlock>

      {/* SECTION 8 — Problem statement pull-quote */}
      <RevealBlock className="mb-20">
        <div id="problem" className="scroll-mt-24 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.97) 0%, rgba(5,150,105,1) 100%)',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.12] pointer-events-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            }}
          />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/90 font-bold mb-4">
              Problem statement
            </p>
            <p className="text-xl md:text-2xl font-extrabold font-headline tracking-tight text-white leading-snug">
              Low-income Australian adults experiencing moderate food insecurity need better support to make affordable and realistic food decisions, because budget pressure, time constraints, meal planning difficulty, and limited cooking confidence make it hard to consistently turn low-cost ingredients into nutritious everyday meals.
            </p>
          </div>
        </div>
      </RevealBlock>

      {/* SECTION 9 — Persona (Sarah) */}
      <RevealBlock className="mb-20">
        <SectionHeading
          id="persona"
          kicker="Part nine"
          title="Persona"
          subtitle="Sarah represents the consolidated target user. She is not a specific individual; she is an evidence-backed composite drawn from the research above."
        />

        <div className="rounded-3xl bg-surface-container-lowest border border-emerald-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-0">
            {/* Left rail — persona meta */}
            <div className="bg-emerald-50/70 p-6 md:p-8 border-b md:border-b-0 md:border-r border-emerald-100">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white font-black text-3xl mb-4 shadow-lg shadow-emerald-900/10">
                S
              </div>
              <dl className="space-y-2.5 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold">Name</dt>
                  <dd className="text-on-surface font-semibold">{PERSONA.name}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold">Age</dt>
                  <dd className="text-on-surface">{PERSONA.age}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold">Location</dt>
                  <dd className="text-on-surface">{PERSONA.location}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold">Household</dt>
                  <dd className="text-on-surface">{PERSONA.household}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold">Income context</dt>
                  <dd className="text-on-surface">{PERSONA.income}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold">Housing</dt>
                  <dd className="text-on-surface">{PERSONA.housing}</dd>
                </div>
              </dl>
            </div>

            {/* Right — persona details */}
            <div className="p-6 md:p-8 space-y-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-bold mb-2">Background</p>
                <p className="text-sm text-on-surface leading-relaxed">{PERSONA.background}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-bold mb-2">Goals</p>
                  <ul className="list-disc list-outside pl-5 text-sm text-on-surface space-y-1.5">
                    {PERSONA.goals.map((g, i) => <li key={i}>{g}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-bold mb-2">Barriers</p>
                  <ul className="list-disc list-outside pl-5 text-sm text-on-surface space-y-1.5">
                    {PERSONA.barriers.map((g, i) => <li key={i}>{g}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-bold mb-2">Behaviours</p>
                  <ul className="list-disc list-outside pl-5 text-sm text-on-surface space-y-1.5">
                    {PERSONA.behaviours.map((g, i) => <li key={i}>{g}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-bold mb-2">Frustrations</p>
                  <ul className="list-disc list-outside pl-5 text-sm text-on-surface space-y-1.5">
                    {PERSONA.frustrations.map((g, i) => <li key={i}>{g}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealBlock>

      {/* SECTION 10 — Empathy map */}
      <RevealBlock className="mb-20">
        <SectionHeading
          id="empathy"
          kicker="Part ten"
          title="Empathy Map"
          subtitle="Sarah's perspective distilled into the classic four quadrants plus Pain and Gain."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <EmpathyQuadrant title="Think & Feel" icon="psychology" items={EMPATHY.think} tint="bg-emerald-50/70 border-emerald-200" />
          <EmpathyQuadrant title="Hear"          icon="hearing"    items={EMPATHY.hear}  tint="bg-amber-50/70 border-amber-200" />
          <EmpathyQuadrant title="See"           icon="visibility" items={EMPATHY.see}   tint="bg-sky-50/70 border-sky-200" />
          <EmpathyQuadrant title="Say & Do"      icon="record_voice_over" items={EMPATHY.sayDo} tint="bg-violet-50/70 border-violet-200" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <EmpathyQuadrant title="Pain" icon="mood_bad"  items={EMPATHY.pain} tint="bg-red-50/70 border-red-200 text-red-900" />
          <EmpathyQuadrant title="Gain" icon="auto_awesome" items={EMPATHY.gain} tint="bg-emerald-50/70 border-emerald-200 text-emerald-900" />
        </div>
      </RevealBlock>

      {/* SECTION 11 — Potential sponsors */}
      <RevealBlock className="mb-20">
        <SectionHeading
          id="sponsors"
          kicker="Part eleven"
          title="Potential Sponsors"
          subtitle="Organisations whose mandate overlaps with ours. Partnerships here would shape the data layer and the reach of any future rollout."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SPONSORS.map((s) => (
            <article key={s.name} className="rounded-2xl bg-surface-container-lowest border border-emerald-100 p-5">
              <h3 className="text-base font-extrabold font-headline text-emerald-900 tracking-tight mb-1.5">
                {s.name}
              </h3>
              {s.purpose && (
                <p className="text-sm text-on-surface leading-relaxed mb-2">{s.purpose}</p>
              )}
              {s.detail && (
                <p className="text-xs text-on-surface-variant leading-relaxed">{s.detail}</p>
              )}
            </article>
          ))}
        </div>
      </RevealBlock>

      {/* SECTION 12 — Solution directions */}
      <RevealBlock className="mb-20">
        <SectionHeading
          id="solutions"
          kicker="Part twelve"
          title="Solution Directions"
          subtitle="Ten concept directions organised into four functional categories."
        />
        <div className="space-y-6">
          {SOLUTION_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 font-bold mb-3">
                {cat.label}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cat.items.map((it) => (
                  <article key={it.title} className="rounded-2xl bg-surface-container-lowest border border-emerald-100 p-4">
                    <h4 className="font-bold text-on-surface text-sm leading-tight mb-1.5">{it.title}</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{it.body}</p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </RevealBlock>

      {/* SECTION 13 — Concept evaluation */}
      <RevealBlock className="mb-20">
        <SectionHeading
          id="concept"
          kicker="Part thirteen"
          title="Concept Evaluation and Solution"
          subtitle="Refining the selected concept using relevant elements from teammates' proposals."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <article className="rounded-3xl p-6 bg-surface-container-lowest border border-emerald-100">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-bold mb-3">Borrowed from Arsh&apos;s proposal</p>
            <ul className="list-disc list-outside pl-5 text-sm text-on-surface space-y-1.5">
              <li>Price / inflation awareness as a data layer</li>
              <li>Cheaper substitutes that maintain nutritional value</li>
              <li>Low-waste meal combinations using overlapping ingredients</li>
              <li><span className="font-semibold">Datasets:</span> ABS CPI, Monthly CPI, AUSNUT, Australian Food Composition Database</li>
            </ul>
          </article>
          <article className="rounded-3xl p-6 bg-surface-container-lowest border border-emerald-100">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-bold mb-3">Borrowed from Shimmin&apos;s proposal</p>
            <ul className="list-disc list-outside pl-5 text-sm text-on-surface space-y-1.5">
              <li>Low cognitive load design principle</li>
              <li>Working from existing ingredients to reduce waste and decision fatigue</li>
              <li>Being non-judgmental in the way the app communicates</li>
              <li>Including frozen, canned, and discounted foods as valid budget-conscious options</li>
              <li><span className="font-semibold">Datasets:</span> AUSNUT 2023, AUSNUT – Food Measures, AUSNUT – Dietary Guidelines Dataset, Australian Dietary Guidelines, Australian Food Composition Database, Open Food Facts</li>
            </ul>
          </article>
        </div>
        <p className="mt-6 text-sm text-on-surface-variant leading-relaxed max-w-3xl">
          We incorporated the elements most relevant to our chosen audience and problem space, while excluding features that were less aligned with moderate food insecurity or everyday household food decision-making.
        </p>
      </RevealBlock>

      {/* SECTION 14 — All 18 key features */}
      <RevealBlock className="mb-20">
        <SectionHeading
          id="features"
          kicker="Part fourteen"
          title="Key Features (full roster)"
          subtitle="Eighteen features that define the system, pulled verbatim from the design document. Discussion in progress — susceptible to change as iteration 2 and 3 surface new constraints."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {KEY_FEATURES.map((f) => (
            <motion.article
              key={f.n}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.36, ease: EASE }}
              className="rounded-2xl p-5 bg-surface-container-lowest border border-emerald-100"
            >
              <div className="flex items-start gap-3 mb-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold">
                  {String(f.n).padStart(2, '0')}
                </span>
                <h3 className="text-base font-extrabold font-headline text-on-surface leading-tight mt-0.5">
                  {f.title}
                </h3>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {f.body}
              </p>
            </motion.article>
          ))}
        </div>
      </RevealBlock>

      {/* Footer CTA */}
      <RevealBlock>
        <div className="rounded-[2.5rem] p-6 md:p-8 bg-emerald-50/60 border border-emerald-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 font-bold mb-2">Full document</p>
            <h3 className="text-lg md:text-xl font-extrabold font-headline text-emerald-900 mb-1">
              Want to cite specific pages?
            </h3>
            <p className="text-sm text-on-surface-variant max-w-xl">
              Open the full Complete Design Process document in Google Docs. Everything on this page is pulled from it verbatim.
            </p>
          </div>
          <a
            href={DOC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-700 text-white font-bold text-sm shadow-md hover:bg-emerald-800 transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-base">description</span>
            Open document
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </a>
        </div>
      </RevealBlock>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empathy quadrant (component used above)

function EmpathyQuadrant({ title, icon, items, tint = '' }) {
  return (
    <article className={`rounded-2xl p-5 border ${tint}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
        <h3 className="text-sm font-extrabold font-headline tracking-tight">
          {title}
        </h3>
      </div>
      <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed">
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </article>
  )
}
