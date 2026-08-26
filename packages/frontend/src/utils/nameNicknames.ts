/**
 * Bidirectional given-name nickname groups.
 * Shared nicknames (e.g. "chris") do not make Christopher ≡ Christine.
 */
const NICKNAME_GROUPS: readonly (readonly string[])[] = [
    ["james", "jim", "jimmy", "jamie"],
    ["john", "jack", "johnny", "jon"],
    ["jonathan", "jon", "jonny"],
    ["robert", "rob", "bob", "bobby", "robbie"],
    ["william", "will", "bill", "billy", "liam", "willie"],
    ["richard", "rick", "dick", "rich", "ricky"],
    ["michael", "mike", "mikey", "mick"],
    ["christopher", "chris", "kit"],
    ["christine", "chris", "chrissy", "tina"],
    ["christina", "chris", "chrissy", "tina"],
    ["joseph", "joe", "joey"],
    ["josephine", "jo", "josie"],
    ["thomas", "tom", "tommy"],
    ["charles", "chuck", "charlie", "chas"],
    ["daniel", "dan", "danny"],
    ["matthew", "matt", "matty"],
    ["anthony", "tony"],
    ["andrew", "andy", "drew"],
    ["david", "dave", "davy"],
    ["edward", "ed", "ted", "teddy", "eddie"],
    ["steven", "stephen", "steve", "stevie"],
    ["benjamin", "ben", "benny"],
    ["samuel", "sam", "sammy"],
    ["samantha", "sam", "sammy"],
    ["nicholas", "nick", "nicky"],
    ["alexander", "alex", "xander"],
    ["alexandra", "alex", "lexi", "sandra"],
    ["patrick", "pat", "paddy"],
    ["patricia", "pat", "patty", "trish"],
    ["peter", "pete"],
    ["timothy", "tim", "timmy"],
    ["gregory", "greg"],
    ["ronald", "ron", "ronny"],
    ["donald", "don", "donnie"],
    ["kenneth", "ken", "kenny"],
    ["lawrence", "larry"],
    ["laurence", "larry"],
    ["raymond", "ray"],
    ["gerald", "jerry"],
    ["henry", "hank", "harry"],
    ["francis", "frank", "fran"],
    ["franklin", "frank"],
    ["frances", "fran", "frannie"],
    ["philip", "phillip", "phil"],
    ["theodore", "ted", "teddy", "theo"],
    ["albert", "al", "bert"],
    ["arthur", "art"],
    ["frederick", "fred", "freddy"],
    ["douglas", "doug"],
    ["nathan", "nathaniel", "nate"],
    ["zachary", "zac", "zach"],
    ["jacob", "jake"],
    ["joshua", "josh"],
    ["jeffrey", "jeff"],
    ["vincent", "vince", "vinny"],
    ["russell", "russ"],
    ["harold", "harry", "hal"],
    ["stanley", "stan"],
    ["leonard", "leo", "len"],
    ["wesley", "wes"],
    ["howard", "howie"],
    ["norman", "norm"],
    ["clifford", "cliff"],
    ["ernest", "ernie"],
    ["herbert", "herb"],
    ["bernard", "bernie"],
    ["maxwell", "max"],
    ["gilbert", "gil"],
    ["rodney", "rod"],
    ["elizabeth", "liz", "lizzy", "beth", "betty", "eliza", "bess"],
    ["jennifer", "jen", "jenny", "jenn"],
    ["jessica", "jess", "jessie"],
    ["barbara", "barb"],
    ["susan", "sue", "suzy", "suzie"],
    ["margaret", "maggie", "meg", "peggy", "marge"],
    ["dorothy", "dot", "dotty"],
    ["sandra", "sandy"],
    ["kimberly", "kim"],
    ["deborah", "deb", "debbie"],
    ["stephanie", "steph"],
    ["rebecca", "becky"],
    ["cynthia", "cindy"],
    ["kathleen", "kathy", "kate", "katie"],
    ["katherine", "kate", "kathy", "katie", "katy"],
    ["catherine", "cate", "cathy", "kate", "katie"],
    ["victoria", "vicky", "tori"],
    ["virginia", "ginny"],
    ["pamela", "pam"],
    ["judith", "judy"],
    ["theresa", "teresa", "terry", "tess", "terri"],
    ["eleanor", "ellie", "nell", "nellie"],
    ["lillian", "lily", "lil"],
    ["abigail", "abby"],
    ["isabella", "izzy", "bella"],
    ["charlotte", "charlie", "lottie"],
    ["olivia", "liv", "livvy"],
    ["natalie", "nat"],
    ["megan", "meghan", "meg"],
    ["angela", "angie"],
    ["amanda", "mandy"],
    ["nicole", "nikki"],
    ["caroline", "carolyn", "carol", "carrie"],
    ["melissa", "missy", "mel"],
    ["michelle", "shelly"],
    ["sarah", "sally"],
    ["anne", "ann", "annie"],
    ["sophia", "sophie"],
];

const GROUPS: ReadonlySet<string>[] = NICKNAME_GROUPS.map((group) => new Set(group));

const NAME_TO_GROUPS = GROUPS.reduce((lookup, group, index) => {
    group.forEach((name) => {
        const groups = lookup.get(name) ?? [];
        groups.push(index);
        lookup.set(name, groups);
    });
    return lookup;
}, new Map<string, number[]>());

export function namesAreNicknames(left: string, right: string): boolean {
    if (left === right) {
        return false;
    }
    const groupIndexes = NAME_TO_GROUPS.get(left);
    if (!groupIndexes) {
        return false;
    }
    return groupIndexes.some((index) => GROUPS[index].has(right));
}
