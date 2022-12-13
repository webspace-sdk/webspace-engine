import EmojiTar from "!!url-loader!../assets/jel/emojis.tar";
import untar from "js-untar";

export const EmojiList = [
  {
    name: "100",
    unicode: "1f4af",
    shortname: ":100:",
    code: "&#128175;",
    category: "s",
    emoji_order: "2119",
    char: "💯"
  },
  {
    name: "1234",
    unicode: "1f522",
    shortname: ":1234:",
    code: "&#128290;",
    category: "s",
    emoji_order: "2122",
    char: "🔢"
  },
  {
    name: "grinning",
    unicode: "1f600",
    shortname: ":grinning:",
    code: "&#128512;",
    category: "p",
    emoji_order: "1",
    char: "😀"
  },
  {
    name: "grin",
    unicode: "1f601",
    shortname: ":grin:",
    code: "&#128513;",
    category: "p",
    emoji_order: "2",
    char: "😁"
  },
  { name: "joy", unicode: "1f602", shortname: ":joy:", code: "&#128514;", category: "p", emoji_order: "3", char: "😂" },
  {
    name: "rolling_on_the_floor_laughing",
    unicode: "1f923",
    shortname: ":rofl:",
    code: "&#129315;",
    category: "p",
    emoji_order: "4",
    char: "🤣"
  },
  {
    name: "smiley",
    unicode: "1f603",
    shortname: ":smiley:",
    code: "&#128515;",
    category: "p",
    emoji_order: "5",
    char: "😃"
  },
  {
    name: "smile",
    unicode: "1f604",
    shortname: ":smile:",
    code: "&#128516;",
    category: "p",
    emoji_order: "6",
    char: "😄"
  },
  {
    name: "sweat_smile",
    unicode: "1f605",
    shortname: ":sweat_smile:",
    code: "&#128517;",
    category: "p",
    emoji_order: "7",
    char: "😅"
  },
  {
    name: "laughing",
    unicode: "1f606",
    shortname: ":laughing:",
    code: "&#128518;",
    category: "p",
    emoji_order: "8",
    char: "😆"
  },
  {
    name: "wink",
    unicode: "1f609",
    shortname: ":wink:",
    code: "&#128521;",
    category: "p",
    emoji_order: "9",
    char: "😉"
  },
  {
    name: "blush",
    unicode: "1f60a",
    shortname: ":blush:",
    code: "&#128522;",
    category: "p",
    emoji_order: "10",
    char: "😊"
  },
  {
    name: "yum",
    unicode: "1f60b",
    shortname: ":yum:",
    code: "&#128523;",
    category: "p",
    emoji_order: "11",
    char: "😋"
  },
  {
    name: "sunglasses",
    unicode: "1f60e",
    shortname: ":sunglasses:",
    code: "&#128526;",
    category: "p",
    emoji_order: "12",
    char: "😎"
  },
  {
    name: "heart_eyes",
    unicode: "1f60d",
    shortname: ":heart_eyes:",
    code: "&#128525;",
    category: "p",
    emoji_order: "13",
    char: "😍"
  },
  {
    name: "kissing_heart",
    unicode: "1f618",
    shortname: ":kissing_heart:",
    code: "&#128536;",
    category: "p",
    emoji_order: "14",
    char: "😘"
  },
  {
    name: "kissing",
    unicode: "1f617",
    shortname: ":kissing:",
    code: "&#128535;",
    category: "p",
    emoji_order: "15",
    char: "😗"
  },
  {
    name: "kissing_smiling_eyes",
    unicode: "1f619",
    shortname: ":kissing_smiling_eyes:",
    code: "&#128537;",
    category: "p",
    emoji_order: "16",
    char: "😙"
  },
  {
    name: "kissing_closed_eyes",
    unicode: "1f61a",
    shortname: ":kissing_closed_eyes:",
    code: "&#128538;",
    category: "p",
    emoji_order: "17",
    char: "😚"
  },
  {
    name: "slightly_smiling_face",
    unicode: "1f642",
    shortname: ":slight_smile:",
    code: "&#128578;",
    category: "p",
    emoji_order: "19",
    char: "🙂"
  },
  {
    name: "hugging_face",
    unicode: "1f917",
    shortname: ":hugging:",
    code: "&#129303;",
    category: "p",
    emoji_order: "20",
    char: "🤗"
  },
  {
    name: "thinking_face",
    unicode: "1f914",
    shortname: ":thinking:",
    code: "&#129300;",
    category: "p",
    emoji_order: "21",
    char: "🤔"
  },
  {
    name: "neutral_face",
    unicode: "1f610",
    shortname: ":neutral_face:",
    code: "&#128528;",
    category: "p",
    emoji_order: "22",
    char: "😐"
  },
  {
    name: "expressionless",
    unicode: "1f611",
    shortname: ":expressionless:",
    code: "&#128529;",
    category: "p",
    emoji_order: "23",
    char: "😑"
  },
  {
    name: "no_mouth",
    unicode: "1f636",
    shortname: ":no_mouth:",
    code: "&#128566;",
    category: "p",
    emoji_order: "24",
    char: "😶"
  },
  {
    name: "face_with_rolling_eyes",
    unicode: "1f644",
    shortname: ":rolling_eyes:",
    code: "&#128580;",
    category: "p",
    emoji_order: "25",
    char: "🙄"
  },
  {
    name: "smirk",
    unicode: "1f60f",
    shortname: ":smirk:",
    code: "&#128527;",
    category: "p",
    emoji_order: "26",
    char: "😏"
  },
  {
    name: "persevere",
    unicode: "1f623",
    shortname: ":persevere:",
    code: "&#128547;",
    category: "p",
    emoji_order: "27",
    char: "😣"
  },
  {
    name: "disappointed_relieved",
    unicode: "1f625",
    shortname: ":disappointed_relieved:",
    code: "&#128549;",
    category: "p",
    emoji_order: "28",
    char: "😥"
  },
  {
    name: "open_mouth",
    unicode: "1f62e",
    shortname: ":open_mouth:",
    code: "&#128558;",
    category: "p",
    emoji_order: "29",
    char: "😮"
  },
  {
    name: "zipper_mouth_face",
    unicode: "1f910",
    shortname: ":zipper_mouth:",
    code: "&#129296;",
    category: "p",
    emoji_order: "30",
    char: "🤐"
  },
  {
    name: "hushed",
    unicode: "1f62f",
    shortname: ":hushed:",
    code: "&#128559;",
    category: "p",
    emoji_order: "31",
    char: "😯"
  },
  {
    name: "sleepy",
    unicode: "1f62a",
    shortname: ":sleepy:",
    code: "&#128554;",
    category: "p",
    emoji_order: "32",
    char: "😪"
  },
  {
    name: "tired_face",
    unicode: "1f62b",
    shortname: ":tired_face:",
    code: "&#128555;",
    category: "p",
    emoji_order: "33",
    char: "😫"
  },
  {
    name: "sleeping",
    unicode: "1f634",
    shortname: ":sleeping:",
    code: "&#128564;",
    category: "p",
    emoji_order: "34",
    char: "😴"
  },
  {
    name: "relieved",
    unicode: "1f60c",
    shortname: ":relieved:",
    code: "&#128524;",
    category: "p",
    emoji_order: "35",
    char: "😌"
  },
  {
    name: "nerd_face",
    unicode: "1f913",
    shortname: ":nerd:",
    code: "&#129299;",
    category: "p",
    emoji_order: "36",
    char: "🤓"
  },
  {
    name: "stuck_out_tongue",
    unicode: "1f61b",
    shortname: ":stuck_out_tongue:",
    code: "&#128539;",
    category: "p",
    emoji_order: "37",
    char: "😛"
  },
  {
    name: "stuck_out_tongue_winking_eye",
    unicode: "1f61c",
    shortname: ":stuck_out_tongue_winking_eye:",
    code: "&#128540;",
    category: "p",
    emoji_order: "38",
    char: "😜"
  },
  {
    name: "stuck_out_tongue_closed_eyes",
    unicode: "1f61d",
    shortname: ":stuck_out_tongue_closed_eyes:",
    code: "&#128541;",
    category: "p",
    emoji_order: "39",
    char: "😝"
  },
  {
    name: "drooling_face",
    unicode: "1f924",
    shortname: ":drooling_face:",
    code: "&#129316;",
    category: "p",
    emoji_order: "40",
    char: "🤤"
  },
  {
    name: "unamused",
    unicode: "1f612",
    shortname: ":unamused:",
    code: "&#128530;",
    category: "p",
    emoji_order: "41",
    char: "😒"
  },
  {
    name: "sweat",
    unicode: "1f613",
    shortname: ":sweat:",
    code: "&#128531;",
    category: "p",
    emoji_order: "42",
    char: "😓"
  },
  {
    name: "pensive",
    unicode: "1f614",
    shortname: ":pensive:",
    code: "&#128532;",
    category: "p",
    emoji_order: "43",
    char: "😔"
  },
  {
    name: "confused",
    unicode: "1f615",
    shortname: ":confused:",
    code: "&#128533;",
    category: "p",
    emoji_order: "44",
    char: "😕"
  },
  {
    name: "upside_down_face",
    unicode: "1f643",
    shortname: ":upside_down:",
    code: "&#128579;",
    category: "p",
    emoji_order: "45",
    char: "🙃"
  },
  {
    name: "money_mouth_face",
    unicode: "1f911",
    shortname: ":money_mouth:",
    code: "&#129297;",
    category: "p",
    emoji_order: "46",
    char: "🤑"
  },
  {
    name: "astonished",
    unicode: "1f632",
    shortname: ":astonished:",
    code: "&#128562;",
    category: "p",
    emoji_order: "47",
    char: "😲"
  },
  {
    name: "slightly_frowning_face",
    unicode: "1f641",
    shortname: ":slight_frown:",
    code: "&#128577;",
    category: "p",
    emoji_order: "49",
    char: "🙁"
  },
  {
    name: "confounded",
    unicode: "1f616",
    shortname: ":confounded:",
    code: "&#128534;",
    category: "p",
    emoji_order: "50",
    char: "😖"
  },
  {
    name: "disappointed",
    unicode: "1f61e",
    shortname: ":disappointed:",
    code: "&#128542;",
    category: "p",
    emoji_order: "51",
    char: "😞"
  },
  {
    name: "worried",
    unicode: "1f61f",
    shortname: ":worried:",
    code: "&#128543;",
    category: "p",
    emoji_order: "52",
    char: "😟"
  },
  {
    name: "triumph",
    unicode: "1f624",
    shortname: ":triumph:",
    code: "&#128548;",
    category: "p",
    emoji_order: "53",
    char: "😤"
  },
  {
    name: "cry",
    unicode: "1f622",
    shortname: ":cry:",
    code: "&#128546;",
    category: "p",
    emoji_order: "54",
    char: "😢"
  },
  {
    name: "sob",
    unicode: "1f62d",
    shortname: ":sob:",
    code: "&#128557;",
    category: "p",
    emoji_order: "55",
    char: "😭"
  },
  {
    name: "frowning",
    unicode: "1f626",
    shortname: ":frowning:",
    code: "&#128550;",
    category: "p",
    emoji_order: "56",
    char: "😦"
  },
  {
    name: "anguished",
    unicode: "1f627",
    shortname: ":anguished:",
    code: "&#128551;",
    category: "p",
    emoji_order: "57",
    char: "😧"
  },
  {
    name: "fearful",
    unicode: "1f628",
    shortname: ":fearful:",
    code: "&#128552;",
    category: "p",
    emoji_order: "58",
    char: "😨"
  },
  {
    name: "weary",
    unicode: "1f629",
    shortname: ":weary:",
    code: "&#128553;",
    category: "p",
    emoji_order: "59",
    char: "😩"
  },
  {
    name: "grimacing",
    unicode: "1f62c",
    shortname: ":grimacing:",
    code: "&#128556;",
    category: "p",
    emoji_order: "60",
    char: "😬"
  },
  {
    name: "cold_sweat",
    unicode: "1f630",
    shortname: ":cold_sweat:",
    code: "&#128560;",
    category: "p",
    emoji_order: "61",
    char: "😰"
  },
  {
    name: "scream",
    unicode: "1f631",
    shortname: ":scream:",
    code: "&#128561;",
    category: "p",
    emoji_order: "62",
    char: "😱"
  },
  {
    name: "flushed",
    unicode: "1f633",
    shortname: ":flushed:",
    code: "&#128563;",
    category: "p",
    emoji_order: "63",
    char: "😳"
  },
  {
    name: "dizzy_face",
    unicode: "1f635",
    shortname: ":dizzy_face:",
    code: "&#128565;",
    category: "p",
    emoji_order: "64",
    char: "😵"
  },
  {
    name: "rage",
    unicode: "1f621",
    shortname: ":rage:",
    code: "&#128545;",
    category: "p",
    emoji_order: "65",
    char: "😡"
  },
  {
    name: "angry",
    unicode: "1f620",
    shortname: ":angry:",
    code: "&#128544;",
    category: "p",
    emoji_order: "66",
    char: "😠"
  },
  {
    name: "innocent",
    unicode: "1f607",
    shortname: ":innocent:",
    code: "&#128519;",
    category: "p",
    emoji_order: "67",
    char: "😇"
  },
  {
    name: "face_with_cowboy_hat",
    unicode: "1f920",
    shortname: ":cowboy:",
    code: "&#129312;",
    category: "p",
    emoji_order: "68",
    char: "🤠"
  },
  {
    name: "clown_face",
    unicode: "1f921",
    shortname: ":clown:",
    code: "&#129313;",
    category: "p",
    emoji_order: "69",
    char: "🤡"
  },
  {
    name: "lying_face",
    unicode: "1f925",
    shortname: ":lying_face:",
    code: "&#129317;",
    category: "p",
    emoji_order: "70",
    char: "🤥"
  },
  {
    name: "mask",
    unicode: "1f637",
    shortname: ":mask:",
    code: "&#128567;",
    category: "p",
    emoji_order: "71",
    char: "😷"
  },
  {
    name: "face_with_thermometer",
    unicode: "1f912",
    shortname: ":thermometer_face:",
    code: "&#129298;",
    category: "p",
    emoji_order: "72",
    char: "🤒"
  },
  {
    name: "face_with_head_bandage",
    unicode: "1f915",
    shortname: ":head_bandage:",
    code: "&#129301;",
    category: "p",
    emoji_order: "73",
    char: "🤕"
  },
  {
    name: "nauseated_face",
    unicode: "1f922",
    shortname: ":nauseated_face:",
    code: "&#129314;",
    category: "p",
    emoji_order: "74",
    char: "🤢"
  },
  {
    name: "sneezing_face",
    unicode: "1f927",
    shortname: ":sneezing_face:",
    code: "&#129319;",
    category: "p",
    emoji_order: "75",
    char: "🤧"
  },
  {
    name: "smiling_imp",
    unicode: "1f608",
    shortname: ":smiling_imp:",
    code: "&#128520;",
    category: "p",
    emoji_order: "76",
    char: "😈"
  },
  {
    name: "imp",
    unicode: "1f47f",
    shortname: ":imp:",
    code: "&#128127;",
    category: "p",
    emoji_order: "77",
    char: "👿"
  },
  {
    name: "japanese_ogre",
    unicode: "1f479",
    shortname: ":japanese_ogre:",
    code: "&#128121;",
    category: "p",
    emoji_order: "78",
    char: "👹"
  },
  {
    name: "japanese_goblin",
    unicode: "1f47a",
    shortname: ":japanese_goblin:",
    code: "&#128122;",
    category: "p",
    emoji_order: "79",
    char: "👺"
  },
  {
    name: "skull",
    unicode: "1f480",
    shortname: ":skull:",
    code: "&#128128;",
    category: "p",
    emoji_order: "80",
    char: "💀"
  },
  {
    name: "skull_and_crossbones",
    unicode: "2620",
    shortname: ":skull_crossbones:",
    code: "&#9760;",
    category: "o",
    emoji_order: "81",
    char: "☠"
  },
  {
    name: "ghost",
    unicode: "1f47b",
    shortname: ":ghost:",
    code: "&#128123;",
    category: "p",
    emoji_order: "82",
    char: "👻"
  },
  {
    name: "alien",
    unicode: "1f47d",
    shortname: ":alien:",
    code: "&#128125;",
    category: "p",
    emoji_order: "83",
    char: "👽"
  },
  {
    name: "space_invader",
    unicode: "1f47e",
    shortname: ":space_invader:",
    code: "&#128126;",
    category: "a",
    emoji_order: "84",
    char: "👾"
  },
  {
    name: "robot_face",
    unicode: "1f916",
    shortname: ":robot:",
    code: "&#129302;",
    category: "p",
    emoji_order: "85",
    char: "🤖"
  },
  {
    name: "hankey",
    unicode: "1f4a9",
    shortname: ":poop:",
    code: "&#128169;",
    category: "p",
    emoji_order: "86",
    char: "💩"
  },
  {
    name: "smiley_cat",
    unicode: "1f63a",
    shortname: ":smiley_cat:",
    code: "&#128570;",
    category: "p",
    emoji_order: "87",
    char: "😺"
  },
  {
    name: "smile_cat",
    unicode: "1f638",
    shortname: ":smile_cat:",
    code: "&#128568;",
    category: "p",
    emoji_order: "88",
    char: "😸"
  },
  {
    name: "joy_cat",
    unicode: "1f639",
    shortname: ":joy_cat:",
    code: "&#128569;",
    category: "p",
    emoji_order: "89",
    char: "😹"
  },
  {
    name: "heart_eyes_cat",
    unicode: "1f63b",
    shortname: ":heart_eyes_cat:",
    code: "&#128571;",
    category: "p",
    emoji_order: "90",
    char: "😻"
  },
  {
    name: "smirk_cat",
    unicode: "1f63c",
    shortname: ":smirk_cat:",
    code: "&#128572;",
    category: "p",
    emoji_order: "91",
    char: "😼"
  },
  {
    name: "kissing_cat",
    unicode: "1f63d",
    shortname: ":kissing_cat:",
    code: "&#128573;",
    category: "p",
    emoji_order: "92",
    char: "😽"
  },
  {
    name: "scream_cat",
    unicode: "1f640",
    shortname: ":scream_cat:",
    code: "&#128576;",
    category: "p",
    emoji_order: "93",
    char: "🙀"
  },
  {
    name: "crying_cat_face",
    unicode: "1f63f",
    shortname: ":crying_cat_face:",
    code: "&#128575;",
    category: "p",
    emoji_order: "94",
    char: "😿"
  },
  {
    name: "pouting_cat",
    unicode: "1f63e",
    shortname: ":pouting_cat:",
    code: "&#128574;",
    category: "p",
    emoji_order: "95",
    char: "😾"
  },
  {
    name: "see_no_evil",
    unicode: "1f648",
    shortname: ":see_no_evil:",
    code: "&#128584;",
    category: "n",
    emoji_order: "96",
    char: "🙈"
  },
  {
    name: "hear_no_evil",
    unicode: "1f649",
    shortname: ":hear_no_evil:",
    code: "&#128585;",
    category: "n",
    emoji_order: "97",
    char: "🙉"
  },
  {
    name: "speak_no_evil",
    unicode: "1f64a",
    shortname: ":speak_no_evil:",
    code: "&#128586;",
    category: "n",
    emoji_order: "98",
    char: "🙊"
  },
  {
    name: "boy",
    unicode: "1f466",
    shortname: ":boy:",
    code: "&#128102;",
    category: "p",
    emoji_order: "99",
    char: "👦"
  },
  {
    name: "pleading",
    unicode: "1f97a",
    shortname: ":pleading:",
    code: "&#129402;",
    category: "p",
    emoji_order: "100",
    char: "🥺"
  },
  {
    name: "girl",
    unicode: "1f467",
    shortname: ":girl:",
    code: "&#128103;",
    category: "p",
    emoji_order: "105",
    char: "👧"
  },
  {
    name: "man",
    unicode: "1f468",
    shortname: ":man:",
    code: "&#128104;",
    category: "p",
    emoji_order: "111",
    char: "👨"
  },
  {
    name: "woman",
    unicode: "1f469",
    shortname: ":woman:",
    code: "&#128105;",
    category: "p",
    emoji_order: "117",
    char: "👩"
  },
  {
    name: "older_man",
    unicode: "1f474",
    shortname: ":older_man:",
    code: "&#128116;",
    category: "p",
    emoji_order: "123",
    char: "👴"
  },
  {
    name: "older_woman",
    unicode: "1f475",
    shortname: ":older_woman:",
    code: "&#128117;",
    category: "p",
    emoji_order: "129",
    char: "👵"
  },
  {
    name: "baby",
    unicode: "1f476",
    shortname: ":baby:",
    code: "&#128118;",
    category: "p",
    emoji_order: "135",
    char: "👶"
  },
  {
    name: "angel",
    unicode: "1f47c",
    shortname: ":angel:",
    code: "&#128124;",
    category: "p",
    emoji_order: "141",
    char: "👼"
  },
  {
    name: "cop",
    unicode: "1f46e",
    shortname: ":cop:",
    code: "&#128110;",
    category: "p",
    emoji_order: "339",
    char: "👮"
  },
  {
    name: "sleuth_or_spy",
    unicode: "1f575",
    shortname: ":spy:",
    code: "&#128373;",
    category: "p",
    emoji_order: "357",
    char: "🕵"
  },
  {
    name: "guardsman",
    unicode: "1f482",
    shortname: ":guardsman:",
    code: "&#128130;",
    category: "p",
    emoji_order: "375",
    char: "💂"
  },
  {
    name: "construction_worker",
    unicode: "1f477",
    shortname: ":construction_worker:",
    code: "&#128119;",
    category: "p",
    emoji_order: "393",
    char: "👷"
  },
  {
    name: "man_with_turban",
    unicode: "1f473",
    shortname: ":man_with_turban:",
    code: "&#128115;",
    category: "p",
    emoji_order: "411",
    char: "👳"
  },
  {
    name: "person_with_blond_hair",
    unicode: "1f471",
    shortname: ":person_with_blond_hair:",
    code: "&#128113;",
    category: "p",
    emoji_order: "429",
    char: "👱"
  },
  {
    name: "santa",
    unicode: "1f385",
    shortname: ":santa:",
    code: "&#127877;",
    category: "p",
    emoji_order: "447",
    char: "🎅"
  },
  {
    name: "mrs_claus",
    unicode: "1f936",
    shortname: ":mrs_claus:",
    code: "&#129334;",
    category: "p",
    emoji_order: "453",
    char: "🤶"
  },
  {
    name: "princess",
    unicode: "1f478",
    shortname: ":princess:",
    code: "&#128120;",
    category: "p",
    emoji_order: "459",
    char: "👸"
  },
  {
    name: "prince",
    unicode: "1f934",
    shortname: ":prince:",
    code: "&#129332;",
    category: "p",
    emoji_order: "465",
    char: "🤴"
  },
  {
    name: "bride_with_veil",
    unicode: "1f470",
    shortname: ":bride_with_veil:",
    code: "&#128112;",
    category: "p",
    emoji_order: "471",
    char: "👰"
  },
  {
    name: "man_in_tuxedo",
    unicode: "1f935",
    shortname: ":man_in_tuxedo:",
    code: "&#129333;",
    category: "p",
    emoji_order: "477",
    char: "🤵"
  },
  {
    name: "pregnant_woman",
    unicode: "1f930",
    shortname: ":pregnant_woman:",
    code: "&#129328;",
    category: "p",
    emoji_order: "483",
    char: "🤰"
  },
  {
    name: "man_with_gua_pi_mao",
    unicode: "1f472",
    shortname: ":man_with_gua_pi_mao:",
    code: "&#128114;",
    category: "p",
    emoji_order: "489",
    char: "👲"
  },
  {
    name: "person_frowning",
    unicode: "1f64d",
    shortname: ":person_frowning:",
    code: "&#128589;",
    category: "p",
    emoji_order: "495",
    char: "🙍"
  },
  {
    name: "person_with_pouting_face",
    unicode: "1f64e",
    shortname: ":person_with_pouting_face:",
    code: "&#128590;",
    category: "p",
    emoji_order: "513",
    char: "🙎"
  },
  {
    name: "no_good",
    unicode: "1f645",
    shortname: ":no_good:",
    code: "&#128581;",
    category: "p",
    emoji_order: "531",
    char: "🙅"
  },
  {
    name: "ok_woman",
    unicode: "1f646",
    shortname: ":ok_woman:",
    code: "&#128582;",
    category: "p",
    emoji_order: "549",
    char: "🙆"
  },
  {
    name: "information_desk_person",
    unicode: "1f481",
    shortname: ":information_desk_person:",
    code: "&#128129;",
    category: "p",
    emoji_order: "567",
    char: "💁"
  },
  {
    name: "raising_hand",
    unicode: "1f64b",
    shortname: ":raising_hand:",
    code: "&#128587;",
    category: "p",
    emoji_order: "585",
    char: "🙋"
  },
  {
    name: "bow",
    unicode: "1f647",
    shortname: ":bow:",
    code: "&#128583;",
    category: "p",
    emoji_order: "603",
    char: "🙇"
  },
  {
    name: "face_palm",
    unicode: "1f926",
    shortname: ":face_palm:",
    code: "&#129318;",
    category: "p",
    emoji_order: "621",
    char: "🤦"
  },
  {
    name: "shrug",
    unicode: "1f937",
    shortname: ":shrug:",
    code: "&#129335;",
    category: "p",
    emoji_order: "639",
    char: "🤷"
  },
  {
    name: "massage",
    unicode: "1f486",
    shortname: ":massage:",
    code: "&#128134;",
    category: "p",
    emoji_order: "657",
    char: "💆"
  },
  {
    name: "haircut",
    unicode: "1f487",
    shortname: ":haircut:",
    code: "&#128135;",
    category: "p",
    emoji_order: "675",
    char: "💇"
  },
  {
    name: "walking",
    unicode: "1f6b6",
    shortname: ":walking:",
    code: "&#128694;",
    category: "p",
    emoji_order: "693",
    char: "🚶"
  },
  {
    name: "runner",
    unicode: "1f3c3",
    shortname: ":runner:",
    code: "&#127939;",
    category: "p",
    emoji_order: "711",
    char: "🏃"
  },
  {
    name: "dancer",
    unicode: "1f483",
    shortname: ":dancer:",
    code: "&#128131;",
    category: "p",
    emoji_order: "729",
    char: "💃"
  },
  {
    name: "man_dancing",
    unicode: "1f57a",
    shortname: ":man_dancing:",
    code: "&#128378;",
    category: "p",
    emoji_order: "735",
    char: "🕺"
  },
  {
    name: "dancers",
    unicode: "1f46f",
    shortname: ":dancers:",
    code: "&#128111;",
    category: "p",
    emoji_order: "741",
    char: "👯"
  },
  {
    name: "man_in_business_suit_levitating",
    unicode: "1f574",
    shortname: ":levitate:",
    code: "&#128372;",
    category: "a",
    emoji_order: "759",
    char: "🕴"
  },
  {
    name: "speaking_head_in_silhouette",
    unicode: "1f5e3",
    shortname: ":speaking_head:",
    code: "&#128483;",
    category: "p",
    emoji_order: "765",
    char: "🗣"
  },
  {
    name: "bust_in_silhouette",
    unicode: "1f464",
    shortname: ":bust_in_silhouette:",
    code: "&#128100;",
    category: "p",
    emoji_order: "766",
    char: "👤"
  },
  {
    name: "busts_in_silhouette",
    unicode: "1f465",
    shortname: ":busts_in_silhouette:",
    code: "&#128101;",
    category: "p",
    emoji_order: "767",
    char: "👥"
  },
  {
    name: "fencer",
    unicode: "1f93a",
    shortname: ":fencer:",
    code: "&#129338;",
    category: "a",
    emoji_order: "768",
    char: "🤺"
  },
  {
    name: "horse_racing",
    unicode: "1f3c7",
    shortname: ":horse_racing:",
    code: "&#127943;",
    category: "a",
    emoji_order: "769",
    char: "🏇"
  },
  {
    name: "skier",
    unicode: "26f7",
    shortname: ":skier:",
    code: "&#9975;",
    category: "a",
    emoji_order: "775",
    char: "⛷"
  },
  {
    name: "snowboarder",
    unicode: "1f3c2",
    shortname: ":snowboarder:",
    code: "&#127938;",
    category: "a",
    emoji_order: "776",
    char: "🏂"
  },
  {
    name: "golfer",
    unicode: "1f3cc",
    shortname: ":golfer:",
    code: "&#127948;",
    category: "a",
    emoji_order: "782",
    char: "🏌"
  },
  {
    name: "surfer",
    unicode: "1f3c4",
    shortname: ":surfer:",
    code: "&#127940;",
    category: "a",
    emoji_order: "800",
    char: "🏄"
  },
  {
    name: "rowboat",
    unicode: "1f6a3",
    shortname: ":rowboat:",
    code: "&#128675;",
    category: "a",
    emoji_order: "818",
    char: "🚣"
  },
  {
    name: "swimmer",
    unicode: "1f3ca",
    shortname: ":swimmer:",
    code: "&#127946;",
    category: "a",
    emoji_order: "836",
    char: "🏊"
  },
  {
    name: "person_with_ball",
    unicode: "26f9",
    shortname: ":basketball_player:",
    code: "&#9977;",
    category: "a",
    emoji_order: "854",
    char: "⛹"
  },
  {
    name: "weight_lifter",
    unicode: "1f3cb",
    shortname: ":lifter:",
    code: "&#127947;",
    category: "a",
    emoji_order: "872",
    char: "🏋"
  },
  {
    name: "bicyclist",
    unicode: "1f6b4",
    shortname: ":bicyclist:",
    code: "&#128692;",
    category: "a",
    emoji_order: "890",
    char: "🚴"
  },
  {
    name: "mountain_bicyclist",
    unicode: "1f6b5",
    shortname: ":mountain_bicyclist:",
    code: "&#128693;",
    category: "a",
    emoji_order: "908",
    char: "🚵"
  },
  {
    name: "racing_car",
    unicode: "1f3ce",
    shortname: ":race_car:",
    code: "&#127950;",
    category: "t",
    emoji_order: "926",
    char: "🏎"
  },
  {
    name: "racing_motorcycle",
    unicode: "1f3cd",
    shortname: ":motorcycle:",
    code: "&#127949;",
    category: "t",
    emoji_order: "927",
    char: "🏍"
  },
  {
    name: "cartwheel",
    unicode: "1f938",
    shortname: ":cartwheel:",
    code: "&#129336;",
    category: "a",
    emoji_order: "928",
    char: "🤸"
  },
  {
    name: "wrestlers",
    unicode: "1f93c",
    shortname: ":wrestlers:",
    code: "&#129340;",
    category: "a",
    emoji_order: "946",
    char: "🤼"
  },
  {
    name: "water_polo",
    unicode: "1f93d",
    shortname: ":water_polo:",
    code: "&#129341;",
    category: "a",
    emoji_order: "964",
    char: "🤽"
  },
  {
    name: "handball",
    unicode: "1f93e",
    shortname: ":handball:",
    code: "&#129342;",
    category: "a",
    emoji_order: "982",
    char: "🤾"
  },
  {
    name: "juggling",
    unicode: "1f939",
    shortname: ":juggling:",
    code: "&#129337;",
    category: "a",
    emoji_order: "1000",
    char: "🤹"
  },
  {
    name: "couple",
    unicode: "1f46b",
    shortname: ":couple:",
    code: "&#128107;",
    category: "p",
    emoji_order: "1018",
    char: "👫"
  },
  {
    name: "two_men_holding_hands",
    unicode: "1f46c",
    shortname: ":two_men_holding_hands:",
    code: "&#128108;",
    category: "p",
    emoji_order: "1024",
    char: "👬"
  },
  {
    name: "two_women_holding_hands",
    unicode: "1f46d",
    shortname: ":two_women_holding_hands:",
    code: "&#128109;",
    category: "p",
    emoji_order: "1030",
    char: "👭"
  },
  {
    name: "couplekiss",
    unicode: "1f48f",
    shortname: ":couplekiss:",
    code: "&#128143;",
    category: "p",
    emoji_order: "1036",
    char: "💏"
  },
  {
    name: "couple_with_heart",
    unicode: "1f491",
    shortname: ":couple_with_heart:",
    code: "&#128145;",
    category: "p",
    emoji_order: "1040",
    char: "💑"
  },
  {
    name: "family",
    unicode: "1f46a",
    shortname: ":family:",
    code: "&#128106;",
    category: "p",
    emoji_order: "1044",
    char: "👪"
  },
  {
    name: "muscle",
    unicode: "1f4aa",
    shortname: ":muscle:",
    code: "&#128170;",
    category: "p",
    emoji_order: "1080",
    char: "💪"
  },
  {
    name: "selfie",
    unicode: "1f933",
    shortname: ":selfie:",
    code: "&#129331;",
    category: "p",
    emoji_order: "1086",
    char: "🤳"
  },
  {
    name: "point_left",
    unicode: "1f448",
    shortname: ":point_left:",
    code: "&#128072;",
    category: "p",
    emoji_order: "1092",
    char: "👈"
  },
  {
    name: "point_right",
    unicode: "1f449",
    shortname: ":point_right:",
    code: "&#128073;",
    category: "p",
    emoji_order: "1098",
    char: "👉"
  },
  {
    name: "point_up",
    unicode: "261d",
    shortname: ":point_up:",
    code: "&#9757;",
    category: "p",
    emoji_order: "1104",
    char: "☝"
  },
  {
    name: "point_up_2",
    unicode: "1f446",
    shortname: ":point_up_2:",
    code: "&#128070;",
    category: "p",
    emoji_order: "1110",
    char: "👆"
  },
  {
    name: "middle_finger",
    unicode: "1f595",
    shortname: ":middle_finger:",
    code: "&#128405;",
    category: "p",
    emoji_order: "1116",
    char: "🖕"
  },
  {
    name: "point_down",
    unicode: "1f447",
    shortname: ":point_down:",
    code: "&#128071;",
    category: "p",
    emoji_order: "1122",
    char: "👇"
  },
  { name: "v", unicode: "270c", shortname: ":v:", code: "&#9996;", category: "p", emoji_order: "1128", char: "✌" },
  {
    name: "fingers_crossed",
    unicode: "1f91e",
    shortname: ":fingers_crossed:",
    code: "&#129310;",
    category: "p",
    emoji_order: "1134",
    char: "🤞"
  },
  {
    name: "vulcan",
    unicode: "1f596",
    shortname: ":vulcan:",
    code: "&#128406;",
    category: "p",
    emoji_order: "1140",
    char: "🖖"
  },
  {
    name: "the_horns",
    unicode: "1f918",
    shortname: ":metal_tone2:",
    code: "&#129304;",
    category: "p",
    emoji_order: "1146",
    char: "🤘"
  },
  {
    name: "call_me",
    unicode: "1f919",
    shortname: ":call_me:",
    code: "&#129305;",
    category: "p",
    emoji_order: "1152",
    char: "🤙"
  },
  {
    name: "raised_hand_with_fingers_splayed",
    unicode: "1f590",
    shortname: ":hand_splayed:",
    code: "&#128400;",
    category: "p",
    emoji_order: "1158",
    char: "🖐"
  },
  {
    name: "raised_hand",
    unicode: "270b",
    shortname: ":raised_hand:",
    code: "&#9995;",
    category: "p",
    emoji_order: "1164",
    char: "✋"
  },
  {
    name: "ok_hand",
    unicode: "1f44c",
    shortname: ":ok_hand:",
    code: "&#128076;",
    category: "p",
    emoji_order: "1170",
    char: "👌"
  },
  {
    name: "thumbsup",
    unicode: "1f44d",
    shortname: ":thumbsup:",
    code: "&#128077;",
    category: "p",
    emoji_order: "1176",
    char: "👍"
  },
  {
    name: "thumbsdown",
    unicode: "1f44e",
    shortname: ":thumbsdown:",
    code: "&#128078;",
    category: "p",
    emoji_order: "1182",
    char: "👎"
  },
  {
    name: "fist",
    unicode: "270a",
    shortname: ":fist:",
    code: "&#9994;",
    category: "p",
    emoji_order: "1188",
    char: "✊"
  },
  {
    name: "facepunch",
    unicode: "1f44a",
    shortname: ":punch:",
    code: "&#128074;",
    category: "p",
    emoji_order: "1194",
    char: "👊"
  },
  {
    name: "left_facing_fist",
    unicode: "1f91b",
    shortname: ":left_facing_fist:",
    code: "&#129307;",
    category: "p",
    emoji_order: "1200",
    char: "🤛"
  },
  {
    name: "right_facing_fist",
    unicode: "1f91c",
    shortname: ":right_facing_fist:",
    code: "&#129308;",
    category: "p",
    emoji_order: "1206",
    char: "🤜"
  },
  {
    name: "raised_back_of_hand",
    unicode: "1f91a",
    shortname: ":raised_back_of_hand:",
    code: "&#129306;",
    category: "p",
    emoji_order: "1212",
    char: "🤚"
  },
  {
    name: "wave",
    unicode: "1f44b",
    shortname: ":wave:",
    code: "&#128075;",
    category: "p",
    emoji_order: "1218",
    char: "👋"
  },
  {
    name: "clap",
    unicode: "1f44f",
    shortname: ":clap:",
    code: "&#128079;",
    category: "p",
    emoji_order: "1224",
    char: "👏"
  },
  {
    name: "writing_hand",
    unicode: "270d",
    shortname: ":writing_hand:",
    code: "&#9997;",
    category: "p",
    emoji_order: "1230",
    char: "✍"
  },
  {
    name: "open_hands",
    unicode: "1f450",
    shortname: ":open_hands:",
    code: "&#128080;",
    category: "p",
    emoji_order: "1236",
    char: "👐"
  },
  {
    name: "raised_hands",
    unicode: "1f64c",
    shortname: ":raised_hands:",
    code: "&#128588;",
    category: "p",
    emoji_order: "1242",
    char: "🙌"
  },
  {
    name: "pray",
    unicode: "1f64f",
    shortname: ":pray:",
    code: "&#128591;",
    category: "p",
    emoji_order: "1248",
    char: "🙏"
  },
  {
    name: "handshake",
    unicode: "1f91d",
    shortname: ":handshake:",
    code: "&#129309;",
    category: "p",
    emoji_order: "1254",
    char: "🤝"
  },
  {
    name: "nail_care",
    unicode: "1f485",
    shortname: ":nail_care:",
    code: "&#128133;",
    category: "p",
    emoji_order: "1260",
    char: "💅"
  },
  {
    name: "ear",
    unicode: "1f442",
    shortname: ":ear:",
    code: "&#128066;",
    category: "p",
    emoji_order: "1266",
    char: "👂"
  },
  {
    name: "nose",
    unicode: "1f443",
    shortname: ":nose:",
    code: "&#128067;",
    category: "p",
    emoji_order: "1272",
    char: "👃"
  },
  {
    name: "footprints",
    unicode: "1f463",
    shortname: ":footprints:",
    code: "&#128099;",
    category: "p",
    emoji_order: "1278",
    char: "👣"
  },
  {
    name: "eyes",
    unicode: "1f440",
    shortname: ":eyes:",
    code: "&#128064;",
    category: "p",
    emoji_order: "1279",
    char: "👀"
  },
  {
    name: "eye",
    unicode: "1f441",
    shortname: ":eye:",
    code: "&#128065;",
    category: "p",
    emoji_order: "1280",
    char: "👁"
  },
  {
    name: "tongue",
    unicode: "1f445",
    shortname: ":tongue:",
    code: "&#128069;",
    category: "p",
    emoji_order: "1282",
    char: "👅"
  },
  {
    name: "lips",
    unicode: "1f444",
    shortname: ":lips:",
    code: "&#128068;",
    category: "p",
    emoji_order: "1283",
    char: "👄"
  },
  {
    name: "kiss",
    unicode: "1f48b",
    shortname: ":kiss:",
    code: "&#128139;",
    category: "p",
    emoji_order: "1284",
    char: "💋"
  },
  {
    name: "cupid",
    unicode: "1f498",
    shortname: ":cupid:",
    code: "&#128152;",
    category: "s",
    emoji_order: "1285",
    char: "💘"
  },
  {
    name: "heart",
    unicode: "2764",
    shortname: ":heart:",
    code: "&#10084;",
    category: "s",
    emoji_order: "1286",
    char: "❤"
  },
  {
    name: "heartbeat",
    unicode: "1f493",
    shortname: ":heartbeat:",
    code: "&#128147;",
    category: "s",
    emoji_order: "1287",
    char: "💓"
  },
  {
    name: "broken_heart",
    unicode: "1f494",
    shortname: ":broken_heart:",
    code: "&#128148;",
    category: "s",
    emoji_order: "1288",
    char: "💔"
  },
  {
    name: "two_hearts",
    unicode: "1f495",
    shortname: ":two_hearts:",
    code: "&#128149;",
    category: "s",
    emoji_order: "1289",
    char: "💕"
  },
  {
    name: "sparkling_heart",
    unicode: "1f496",
    shortname: ":sparkling_heart:",
    code: "&#128150;",
    category: "s",
    emoji_order: "1290",
    char: "💖"
  },
  {
    name: "heartpulse",
    unicode: "1f497",
    shortname: ":heartpulse:",
    code: "&#128151;",
    category: "s",
    emoji_order: "1291",
    char: "💗"
  },
  {
    name: "blue_heart",
    unicode: "1f499",
    shortname: ":blue_heart:",
    code: "&#128153;",
    category: "s",
    emoji_order: "1292",
    char: "💙"
  },
  {
    name: "green_heart",
    unicode: "1f49a",
    shortname: ":green_heart:",
    code: "&#128154;",
    category: "s",
    emoji_order: "1293",
    char: "💚"
  },
  {
    name: "yellow_heart",
    unicode: "1f49b",
    shortname: ":yellow_heart:",
    code: "&#128155;",
    category: "s",
    emoji_order: "1294",
    char: "💛"
  },
  {
    name: "purple_heart",
    unicode: "1f49c",
    shortname: ":purple_heart:",
    code: "&#128156;",
    category: "s",
    emoji_order: "1295",
    char: "💜"
  },
  {
    name: "black_heart",
    unicode: "1f5a4",
    shortname: ":black_heart:",
    code: "&#128420;",
    category: "s",
    emoji_order: "1296",
    char: "🖤"
  },
  {
    name: "gift_heart",
    unicode: "1f49d",
    shortname: ":gift_heart:",
    code: "&#128157;",
    category: "s",
    emoji_order: "1297",
    char: "💝"
  },
  {
    name: "revolving_hearts",
    unicode: "1f49e",
    shortname: ":revolving_hearts:",
    code: "&#128158;",
    category: "s",
    emoji_order: "1298",
    char: "💞"
  },
  {
    name: "heart_decoration",
    unicode: "1f49f",
    shortname: ":heart_decoration:",
    code: "&#128159;",
    category: "s",
    emoji_order: "1299",
    char: "💟"
  },
  {
    name: "heart_exclamation",
    unicode: "2763",
    shortname: ":heart_exclamation:",
    code: "&#10083;",
    category: "s",
    emoji_order: "1300",
    char: "❣"
  },
  {
    name: "love_letter",
    unicode: "1f48c",
    shortname: ":love_letter:",
    code: "&#128140;",
    category: "o",
    emoji_order: "1301",
    char: "💌"
  },
  {
    name: "zzz",
    unicode: "1f4a4",
    shortname: ":zzz:",
    code: "&#128164;",
    category: "p",
    emoji_order: "1302",
    char: "💤"
  },
  {
    name: "anger",
    unicode: "1f4a2",
    shortname: ":anger:",
    code: "&#128162;",
    category: "s",
    emoji_order: "1303",
    char: "💢"
  },
  {
    name: "bomb",
    unicode: "1f4a3",
    shortname: ":bomb:",
    code: "&#128163;",
    category: "o",
    emoji_order: "1304",
    char: "💣"
  },
  {
    name: "boom",
    unicode: "1f4a5",
    shortname: ":boom:",
    code: "&#128165;",
    category: "s",
    emoji_order: "1305",
    char: "💥"
  },
  {
    name: "sweat_drops",
    unicode: "1f4a6",
    shortname: ":sweat_drops:",
    code: "&#128166;",
    category: "n",
    emoji_order: "1306",
    char: "💦"
  },
  {
    name: "dash",
    unicode: "1f4a8",
    shortname: ":dash:",
    code: "&#128168;",
    category: "n",
    emoji_order: "1307",
    char: "💨"
  },
  {
    name: "dizzy",
    unicode: "1f4ab",
    shortname: ":dizzy:",
    code: "&#128171;",
    category: "s",
    emoji_order: "1308",
    char: "💫"
  },
  {
    name: "speech_balloon",
    unicode: "1f4ac",
    shortname: ":speech_balloon:",
    code: "&#128172;",
    category: "s",
    emoji_order: "1309",
    char: "💬"
  },
  {
    name: "left_speech_bubble",
    unicode: "1f5e8",
    shortname: ":speech_left:",
    code: "&#128488;",
    category: "s",
    emoji_order: "1310",
    char: "🗨"
  },
  {
    name: "right_anger_bubble",
    unicode: "1f5ef",
    shortname: ":anger_right:",
    code: "&#128495;",
    category: "s",
    emoji_order: "1311",
    char: "🗯"
  },
  {
    name: "thought_balloon",
    unicode: "1f4ad",
    shortname: ":thought_balloon:",
    code: "&#128173;",
    category: "s",
    emoji_order: "1312",
    char: "💭"
  },
  {
    name: "hole",
    unicode: "1f573",
    shortname: ":hole:",
    code: "&#128371;",
    category: "o",
    emoji_order: "1313",
    char: "🕳"
  },
  {
    name: "eyeglasses",
    unicode: "1f453",
    shortname: ":eyeglasses:",
    code: "&#128083;",
    category: "p",
    emoji_order: "1314",
    char: "👓"
  },
  {
    name: "dark_sunglasses",
    unicode: "1f576",
    shortname: ":dark_sunglasses:",
    code: "&#128374;",
    category: "p",
    emoji_order: "1315",
    char: "🕶"
  },
  {
    name: "necktie",
    unicode: "1f454",
    shortname: ":necktie:",
    code: "&#128084;",
    category: "p",
    emoji_order: "1316",
    char: "👔"
  },
  {
    name: "shirt",
    unicode: "1f455",
    shortname: ":shirt:",
    code: "&#128085;",
    category: "p",
    emoji_order: "1317",
    char: "👕"
  },
  {
    name: "jeans",
    unicode: "1f456",
    shortname: ":jeans:",
    code: "&#128086;",
    category: "p",
    emoji_order: "1318",
    char: "👖"
  },
  {
    name: "dress",
    unicode: "1f457",
    shortname: ":dress:",
    code: "&#128087;",
    category: "p",
    emoji_order: "1319",
    char: "👗"
  },
  {
    name: "kimono",
    unicode: "1f458",
    shortname: ":kimono:",
    code: "&#128088;",
    category: "p",
    emoji_order: "1320",
    char: "👘"
  },
  {
    name: "bikini",
    unicode: "1f459",
    shortname: ":bikini:",
    code: "&#128089;",
    category: "p",
    emoji_order: "1321",
    char: "👙"
  },
  {
    name: "womans_clothes",
    unicode: "1f45a",
    shortname: ":womans_clothes:",
    code: "&#128090;",
    category: "p",
    emoji_order: "1322",
    char: "👚"
  },
  {
    name: "purse",
    unicode: "1f45b",
    shortname: ":purse:",
    code: "&#128091;",
    category: "p",
    emoji_order: "1323",
    char: "👛"
  },
  {
    name: "handbag",
    unicode: "1f45c",
    shortname: ":handbag:",
    code: "&#128092;",
    category: "p",
    emoji_order: "1324",
    char: "👜"
  },
  {
    name: "pouch",
    unicode: "1f45d",
    shortname: ":pouch:",
    code: "&#128093;",
    category: "p",
    emoji_order: "1325",
    char: "👝"
  },
  {
    name: "shopping_bags",
    unicode: "1f6cd",
    shortname: ":shopping_bags:",
    code: "&#128717;",
    category: "o",
    emoji_order: "1326",
    char: "🛍"
  },
  {
    name: "school_satchel",
    unicode: "1f392",
    shortname: ":school_satchel:",
    code: "&#127890;",
    category: "p",
    emoji_order: "1327",
    char: "🎒"
  },
  {
    name: "mans_shoe",
    unicode: "1f45e",
    shortname: ":mans_shoe:",
    code: "&#128094;",
    category: "p",
    emoji_order: "1328",
    char: "👞"
  },
  {
    name: "athletic_shoe",
    unicode: "1f45f",
    shortname: ":athletic_shoe:",
    code: "&#128095;",
    category: "p",
    emoji_order: "1329",
    char: "👟"
  },
  {
    name: "high_heel",
    unicode: "1f460",
    shortname: ":high_heel:",
    code: "&#128096;",
    category: "p",
    emoji_order: "1330",
    char: "👠"
  },
  {
    name: "sandal",
    unicode: "1f461",
    shortname: ":sandal:",
    code: "&#128097;",
    category: "p",
    emoji_order: "1331",
    char: "👡"
  },
  {
    name: "boot",
    unicode: "1f462",
    shortname: ":boot:",
    code: "&#128098;",
    category: "p",
    emoji_order: "1332",
    char: "👢"
  },
  {
    name: "crown",
    unicode: "1f451",
    shortname: ":crown:",
    code: "&#128081;",
    category: "p",
    emoji_order: "1333",
    char: "👑"
  },
  {
    name: "womans_hat",
    unicode: "1f452",
    shortname: ":womans_hat:",
    code: "&#128082;",
    category: "p",
    emoji_order: "1334",
    char: "👒"
  },
  {
    name: "tophat",
    unicode: "1f3a9",
    shortname: ":tophat:",
    code: "&#127913;",
    category: "p",
    emoji_order: "1335",
    char: "🎩"
  },
  {
    name: "mortar_board",
    unicode: "1f393",
    shortname: ":mortar_board:",
    code: "&#127891;",
    category: "p",
    emoji_order: "1336",
    char: "🎓"
  },
  {
    name: "helmet_with_white_cross",
    unicode: "26d1",
    shortname: ":helmet_with_cross:",
    code: "&#9937;",
    category: "p",
    emoji_order: "1337",
    char: "⛑"
  },
  {
    name: "prayer_beads",
    unicode: "1f4ff",
    shortname: ":prayer_beads:",
    code: "&#128255;",
    category: "o",
    emoji_order: "1338",
    char: "📿"
  },
  {
    name: "lipstick",
    unicode: "1f484",
    shortname: ":lipstick:",
    code: "&#128132;",
    category: "p",
    emoji_order: "1339",
    char: "💄"
  },
  {
    name: "ring",
    unicode: "1f48d",
    shortname: ":ring:",
    code: "&#128141;",
    category: "p",
    emoji_order: "1340",
    char: "💍"
  },
  {
    name: "gem",
    unicode: "1f48e",
    shortname: ":gem:",
    code: "&#128142;",
    category: "o",
    emoji_order: "1341",
    char: "💎"
  },
  {
    name: "monkey_face",
    unicode: "1f435",
    shortname: ":monkey_face:",
    code: "&#128053;",
    category: "n",
    emoji_order: "1342",
    char: "🐵"
  },
  {
    name: "monkey",
    unicode: "1f412",
    shortname: ":monkey:",
    code: "&#128018;",
    category: "n",
    emoji_order: "1343",
    char: "🐒"
  },
  {
    name: "gorilla",
    unicode: "1f98d",
    shortname: ":gorilla:",
    code: "&#129421;",
    category: "n",
    emoji_order: "1344",
    char: "🦍"
  },
  {
    name: "dog",
    unicode: "1f436",
    shortname: ":dog:",
    code: "&#128054;",
    category: "n",
    emoji_order: "1345",
    char: "🐶"
  },
  {
    name: "dog2",
    unicode: "1f415",
    shortname: ":dog2:",
    code: "&#128021;",
    category: "n",
    emoji_order: "1346",
    char: "🐕"
  },
  {
    name: "poodle",
    unicode: "1f429",
    shortname: ":poodle:",
    code: "&#128041;",
    category: "n",
    emoji_order: "1347",
    char: "🐩"
  },
  {
    name: "wolf",
    unicode: "1f43a",
    shortname: ":wolf:",
    code: "&#128058;",
    category: "n",
    emoji_order: "1348",
    char: "🐺"
  },
  {
    name: "fox",
    unicode: "1f98a",
    shortname: ":fox:",
    code: "&#129418;",
    category: "n",
    emoji_order: "1349",
    char: "🦊"
  },
  {
    name: "cat",
    unicode: "1f431",
    shortname: ":cat:",
    code: "&#128049;",
    category: "n",
    emoji_order: "1350",
    char: "🐱"
  },
  {
    name: "cat2",
    unicode: "1f408",
    shortname: ":cat2:",
    code: "&#128008;",
    category: "n",
    emoji_order: "1351",
    char: "🐈"
  },
  {
    name: "lion_face",
    unicode: "1f981",
    shortname: ":lion_face:",
    code: "&#129409;",
    category: "n",
    emoji_order: "1352",
    char: "🦁"
  },
  {
    name: "tiger",
    unicode: "1f42f",
    shortname: ":tiger:",
    code: "&#128047;",
    category: "n",
    emoji_order: "1353",
    char: "🐯"
  },
  {
    name: "tiger2",
    unicode: "1f405",
    shortname: ":tiger2:",
    code: "&#128005;",
    category: "n",
    emoji_order: "1354",
    char: "🐅"
  },
  {
    name: "leopard",
    unicode: "1f406",
    shortname: ":leopard:",
    code: "&#128006;",
    category: "n",
    emoji_order: "1355",
    char: "🐆"
  },
  {
    name: "horse",
    unicode: "1f434",
    shortname: ":horse:",
    code: "&#128052;",
    category: "n",
    emoji_order: "1356",
    char: "🐴"
  },
  {
    name: "racehorse",
    unicode: "1f40e",
    shortname: ":racehorse:",
    code: "&#128014;",
    category: "n",
    emoji_order: "1357",
    char: "🐎"
  },
  {
    name: "deer",
    unicode: "1f98c",
    shortname: ":deer:",
    code: "&#129420;",
    category: "n",
    emoji_order: "1358",
    char: "🦌"
  },
  {
    name: "unicorn_face",
    unicode: "1f984",
    shortname: ":unicorn:",
    code: "&#129412;",
    category: "n",
    emoji_order: "1359",
    char: "🦄"
  },
  {
    name: "cow",
    unicode: "1f42e",
    shortname: ":cow:",
    code: "&#128046;",
    category: "n",
    emoji_order: "1360",
    char: "🐮"
  },
  {
    name: "ox",
    unicode: "1f402",
    shortname: ":ox:",
    code: "&#128002;",
    category: "n",
    emoji_order: "1361",
    char: "🐂"
  },
  {
    name: "water_buffalo",
    unicode: "1f403",
    shortname: ":water_buffalo:",
    code: "&#128003;",
    category: "n",
    emoji_order: "1362",
    char: "🐃"
  },
  {
    name: "cow2",
    unicode: "1f404",
    shortname: ":cow2:",
    code: "&#128004;",
    category: "n",
    emoji_order: "1363",
    char: "🐄"
  },
  {
    name: "pig",
    unicode: "1f437",
    shortname: ":pig:",
    code: "&#128055;",
    category: "n",
    emoji_order: "1364",
    char: "🐷"
  },
  {
    name: "pig2",
    unicode: "1f416",
    shortname: ":pig2:",
    code: "&#128022;",
    category: "n",
    emoji_order: "1365",
    char: "🐖"
  },
  {
    name: "boar",
    unicode: "1f417",
    shortname: ":boar:",
    code: "&#128023;",
    category: "n",
    emoji_order: "1366",
    char: "🐗"
  },
  {
    name: "pig_nose",
    unicode: "1f43d",
    shortname: ":pig_nose:",
    code: "&#128061;",
    category: "n",
    emoji_order: "1367",
    char: "🐽"
  },
  {
    name: "ram",
    unicode: "1f40f",
    shortname: ":ram:",
    code: "&#128015;",
    category: "n",
    emoji_order: "1368",
    char: "🐏"
  },
  {
    name: "sheep",
    unicode: "1f411",
    shortname: ":sheep:",
    code: "&#128017;",
    category: "n",
    emoji_order: "1369",
    char: "🐑"
  },
  {
    name: "goat",
    unicode: "1f410",
    shortname: ":goat:",
    code: "&#128016;",
    category: "n",
    emoji_order: "1370",
    char: "🐐"
  },
  {
    name: "dromedary_camel",
    unicode: "1f42a",
    shortname: ":dromedary_camel:",
    code: "&#128042;",
    category: "n",
    emoji_order: "1371",
    char: "🐪"
  },
  {
    name: "camel",
    unicode: "1f42b",
    shortname: ":camel:",
    code: "&#128043;",
    category: "n",
    emoji_order: "1372",
    char: "🐫"
  },
  {
    name: "elephant",
    unicode: "1f418",
    shortname: ":elephant:",
    code: "&#128024;",
    category: "n",
    emoji_order: "1373",
    char: "🐘"
  },
  {
    name: "rhino",
    unicode: "1f98f",
    shortname: ":rhino:",
    code: "&#129423;",
    category: "n",
    emoji_order: "1374",
    char: "🦏"
  },
  {
    name: "mouse",
    unicode: "1f42d",
    shortname: ":mouse:",
    code: "&#128045;",
    category: "n",
    emoji_order: "1375",
    char: "🐭"
  },
  {
    name: "mouse2",
    unicode: "1f401",
    shortname: ":mouse2:",
    code: "&#128001;",
    category: "n",
    emoji_order: "1376",
    char: "🐁"
  },
  {
    name: "rat",
    unicode: "1f400",
    shortname: ":rat:",
    code: "&#128000;",
    category: "n",
    emoji_order: "1377",
    char: "🐀"
  },
  {
    name: "hamster",
    unicode: "1f439",
    shortname: ":hamster:",
    code: "&#128057;",
    category: "n",
    emoji_order: "1378",
    char: "🐹"
  },
  {
    name: "rabbit",
    unicode: "1f430",
    shortname: ":rabbit:",
    code: "&#128048;",
    category: "n",
    emoji_order: "1379",
    char: "🐰"
  },
  {
    name: "rabbit2",
    unicode: "1f407",
    shortname: ":rabbit2:",
    code: "&#128007;",
    category: "n",
    emoji_order: "1380",
    char: "🐇"
  },
  {
    name: "chipmunk",
    unicode: "1f43f",
    shortname: ":chipmunk:",
    code: "&#128063;",
    category: "n",
    emoji_order: "1381",
    char: "🐿"
  },
  {
    name: "bat",
    unicode: "1f987",
    shortname: ":bat:",
    code: "&#129415;",
    category: "n",
    emoji_order: "1382",
    char: "🦇"
  },
  {
    name: "bear",
    unicode: "1f43b",
    shortname: ":bear:",
    code: "&#128059;",
    category: "n",
    emoji_order: "1383",
    char: "🐻"
  },
  {
    name: "koala",
    unicode: "1f428",
    shortname: ":koala:",
    code: "&#128040;",
    category: "n",
    emoji_order: "1384",
    char: "🐨"
  },
  {
    name: "panda_face",
    unicode: "1f43c",
    shortname: ":panda_face:",
    code: "&#128060;",
    category: "n",
    emoji_order: "1385",
    char: "🐼"
  },
  {
    name: "feet",
    unicode: "1f43e",
    shortname: ":feet:",
    code: "&#128062;",
    category: "n",
    emoji_order: "1386",
    char: "🐾"
  },
  {
    name: "turkey",
    unicode: "1f983",
    shortname: ":turkey:",
    code: "&#129411;",
    category: "n",
    emoji_order: "1387",
    char: "🦃"
  },
  {
    name: "chicken",
    unicode: "1f414",
    shortname: ":chicken:",
    code: "&#128020;",
    category: "n",
    emoji_order: "1388",
    char: "🐔"
  },
  {
    name: "rooster",
    unicode: "1f413",
    shortname: ":rooster:",
    code: "&#128019;",
    category: "n",
    emoji_order: "1389",
    char: "🐓"
  },
  {
    name: "hatching_chick",
    unicode: "1f423",
    shortname: ":hatching_chick:",
    code: "&#128035;",
    category: "n",
    emoji_order: "1390",
    char: "🐣"
  },
  {
    name: "baby_chick",
    unicode: "1f424",
    shortname: ":baby_chick:",
    code: "&#128036;",
    category: "n",
    emoji_order: "1391",
    char: "🐤"
  },
  {
    name: "hatched_chick",
    unicode: "1f425",
    shortname: ":hatched_chick:",
    code: "&#128037;",
    category: "n",
    emoji_order: "1392",
    char: "🐥"
  },
  {
    name: "bird",
    unicode: "1f426",
    shortname: ":bird:",
    code: "&#128038;",
    category: "n",
    emoji_order: "1393",
    char: "🐦"
  },
  {
    name: "penguin",
    unicode: "1f427",
    shortname: ":penguin:",
    code: "&#128039;",
    category: "n",
    emoji_order: "1394",
    char: "🐧"
  },
  {
    name: "dove_of_peace",
    unicode: "1f54a",
    shortname: ":dove:",
    code: "&#128330;",
    category: "n",
    emoji_order: "1395",
    char: "🕊"
  },
  {
    name: "eagle",
    unicode: "1f985",
    shortname: ":eagle:",
    code: "&#129413;",
    category: "n",
    emoji_order: "1396",
    char: "🦅"
  },
  {
    name: "duck",
    unicode: "1f986",
    shortname: ":duck:",
    code: "&#129414;",
    category: "n",
    emoji_order: "1397",
    char: "🦆"
  },
  {
    name: "owl",
    unicode: "1f989",
    shortname: ":owl:",
    code: "&#129417;",
    category: "n",
    emoji_order: "1398",
    char: "🦉"
  },
  {
    name: "frog",
    unicode: "1f438",
    shortname: ":frog:",
    code: "&#128056;",
    category: "n",
    emoji_order: "1399",
    char: "🐸"
  },
  {
    name: "crocodile",
    unicode: "1f40a",
    shortname: ":crocodile:",
    code: "&#128010;",
    category: "n",
    emoji_order: "1400",
    char: "🐊"
  },
  {
    name: "turtle",
    unicode: "1f422",
    shortname: ":turtle:",
    code: "&#128034;",
    category: "n",
    emoji_order: "1401",
    char: "🐢"
  },
  {
    name: "lizard",
    unicode: "1f98e",
    shortname: ":lizard:",
    code: "&#129422;",
    category: "n",
    emoji_order: "1402",
    char: "🦎"
  },
  {
    name: "snake",
    unicode: "1f40d",
    shortname: ":snake:",
    code: "&#128013;",
    category: "n",
    emoji_order: "1403",
    char: "🐍"
  },
  {
    name: "dragon_face",
    unicode: "1f432",
    shortname: ":dragon_face:",
    code: "&#128050;",
    category: "n",
    emoji_order: "1404",
    char: "🐲"
  },
  {
    name: "dragon",
    unicode: "1f409",
    shortname: ":dragon:",
    code: "&#128009;",
    category: "n",
    emoji_order: "1405",
    char: "🐉"
  },
  {
    name: "whale",
    unicode: "1f433",
    shortname: ":whale:",
    code: "&#128051;",
    category: "n",
    emoji_order: "1406",
    char: "🐳"
  },
  {
    name: "whale2",
    unicode: "1f40b",
    shortname: ":whale2:",
    code: "&#128011;",
    category: "n",
    emoji_order: "1407",
    char: "🐋"
  },
  {
    name: "dolphin",
    unicode: "1f42c",
    shortname: ":dolphin:",
    code: "&#128044;",
    category: "n",
    emoji_order: "1408",
    char: "🐬"
  },
  {
    name: "fish",
    unicode: "1f41f",
    shortname: ":fish:",
    code: "&#128031;",
    category: "n",
    emoji_order: "1409",
    char: "🐟"
  },
  {
    name: "tropical_fish",
    unicode: "1f420",
    shortname: ":tropical_fish:",
    code: "&#128032;",
    category: "n",
    emoji_order: "1410",
    char: "🐠"
  },
  {
    name: "blowfish",
    unicode: "1f421",
    shortname: ":blowfish:",
    code: "&#128033;",
    category: "n",
    emoji_order: "1411",
    char: "🐡"
  },
  {
    name: "shark",
    unicode: "1f988",
    shortname: ":shark:",
    code: "&#129416;",
    category: "n",
    emoji_order: "1412",
    char: "🦈"
  },
  {
    name: "octopus",
    unicode: "1f419",
    shortname: ":octopus:",
    code: "&#128025;",
    category: "n",
    emoji_order: "1413",
    char: "🐙"
  },
  {
    name: "shell",
    unicode: "1f41a",
    shortname: ":shell:",
    code: "&#128026;",
    category: "n",
    emoji_order: "1414",
    char: "🐚"
  },
  {
    name: "crab",
    unicode: "1f980",
    shortname: ":crab:",
    code: "&#129408;",
    category: "n",
    emoji_order: "1415",
    char: "🦀"
  },
  {
    name: "shrimp",
    unicode: "1f990",
    shortname: ":shrimp:",
    code: "&#129424;",
    category: "n",
    emoji_order: "1416",
    char: "🦐"
  },
  {
    name: "squid",
    unicode: "1f991",
    shortname: ":squid:",
    code: "&#129425;",
    category: "n",
    emoji_order: "1417",
    char: "🦑"
  },
  {
    name: "butterfly",
    unicode: "1f98b",
    shortname: ":butterfly:",
    code: "&#129419;",
    category: "n",
    emoji_order: "1418",
    char: "🦋"
  },
  {
    name: "snail",
    unicode: "1f40c",
    shortname: ":snail:",
    code: "&#128012;",
    category: "n",
    emoji_order: "1419",
    char: "🐌"
  },
  {
    name: "bug",
    unicode: "1f41b",
    shortname: ":bug:",
    code: "&#128027;",
    category: "n",
    emoji_order: "1420",
    char: "🐛"
  },
  {
    name: "ant",
    unicode: "1f41c",
    shortname: ":ant:",
    code: "&#128028;",
    category: "n",
    emoji_order: "1421",
    char: "🐜"
  },
  {
    name: "bee",
    unicode: "1f41d",
    shortname: ":bee:",
    code: "&#128029;",
    category: "n",
    emoji_order: "1422",
    char: "🐝"
  },
  {
    name: "beetle",
    unicode: "1f41e",
    shortname: ":beetle:",
    code: "&#128030;",
    category: "n",
    emoji_order: "1423",
    char: "🐞"
  },
  {
    name: "spider",
    unicode: "1f577",
    shortname: ":spider:",
    code: "&#128375;",
    category: "n",
    emoji_order: "1424",
    char: "🕷"
  },
  {
    name: "spider_web",
    unicode: "1f578",
    shortname: ":spider_web:",
    code: "&#128376;",
    category: "n",
    emoji_order: "1425",
    char: "🕸"
  },
  {
    name: "scorpion",
    unicode: "1f982",
    shortname: ":scorpion:",
    code: "&#129410;",
    category: "n",
    emoji_order: "1426",
    char: "🦂"
  },
  {
    name: "bouquet",
    unicode: "1f490",
    shortname: ":bouquet:",
    code: "&#128144;",
    category: "n",
    emoji_order: "1427",
    char: "💐"
  },
  {
    name: "cherry_blossom",
    unicode: "1f338",
    shortname: ":cherry_blossom:",
    code: "&#127800;",
    category: "n",
    emoji_order: "1428",
    char: "🌸"
  },
  {
    name: "white_flower",
    unicode: "1f4ae",
    shortname: ":white_flower:",
    code: "&#128174;",
    category: "s",
    emoji_order: "1429",
    char: "💮"
  },
  {
    name: "rosette",
    unicode: "1f3f5",
    shortname: ":rosette:",
    code: "&#127989;",
    category: "n",
    emoji_order: "1430",
    char: "🏵"
  },
  {
    name: "rose",
    unicode: "1f339",
    shortname: ":rose:",
    code: "&#127801;",
    category: "n",
    emoji_order: "1431",
    char: "🌹"
  },
  {
    name: "wilted_rose",
    unicode: "1f940",
    shortname: ":wilted_rose:",
    code: "&#129344;",
    category: "n",
    emoji_order: "1432",
    char: "🥀"
  },
  {
    name: "hibiscus",
    unicode: "1f33a",
    shortname: ":hibiscus:",
    code: "&#127802;",
    category: "n",
    emoji_order: "1433",
    char: "🌺"
  },
  {
    name: "sunflower",
    unicode: "1f33b",
    shortname: ":sunflower:",
    code: "&#127803;",
    category: "n",
    emoji_order: "1434",
    char: "🌻"
  },
  {
    name: "blossom",
    unicode: "1f33c",
    shortname: ":blossom:",
    code: "&#127804;",
    category: "n",
    emoji_order: "1435",
    char: "🌼"
  },
  {
    name: "tulip",
    unicode: "1f337",
    shortname: ":tulip:",
    code: "&#127799;",
    category: "n",
    emoji_order: "1436",
    char: "🌷"
  },
  {
    name: "seedling",
    unicode: "1f331",
    shortname: ":seedling:",
    code: "&#127793;",
    category: "n",
    emoji_order: "1437",
    char: "🌱"
  },
  {
    name: "evergreen_tree",
    unicode: "1f332",
    shortname: ":evergreen_tree:",
    code: "&#127794;",
    category: "n",
    emoji_order: "1438",
    char: "🌲"
  },
  {
    name: "deciduous_tree",
    unicode: "1f333",
    shortname: ":deciduous_tree:",
    code: "&#127795;",
    category: "n",
    emoji_order: "1439",
    char: "🌳"
  },
  {
    name: "palm_tree",
    unicode: "1f334",
    shortname: ":palm_tree:",
    code: "&#127796;",
    category: "n",
    emoji_order: "1440",
    char: "🌴"
  },
  {
    name: "cactus",
    unicode: "1f335",
    shortname: ":cactus:",
    code: "&#127797;",
    category: "n",
    emoji_order: "1441",
    char: "🌵"
  },
  {
    name: "ear_of_rice",
    unicode: "1f33e",
    shortname: ":ear_of_rice:",
    code: "&#127806;",
    category: "n",
    emoji_order: "1442",
    char: "🌾"
  },
  {
    name: "herb",
    unicode: "1f33f",
    shortname: ":herb:",
    code: "&#127807;",
    category: "n",
    emoji_order: "1443",
    char: "🌿"
  },
  {
    name: "shamrock",
    unicode: "2618",
    shortname: ":shamrock:",
    code: "&#9752;",
    category: "n",
    emoji_order: "1444",
    char: "☘"
  },
  {
    name: "four_leaf_clover",
    unicode: "1f340",
    shortname: ":four_leaf_clover:",
    code: "&#127808;",
    category: "n",
    emoji_order: "1445",
    char: "🍀"
  },
  {
    name: "maple_leaf",
    unicode: "1f341",
    shortname: ":maple_leaf:",
    code: "&#127809;",
    category: "n",
    emoji_order: "1446",
    char: "🍁"
  },
  {
    name: "fallen_leaf",
    unicode: "1f342",
    shortname: ":fallen_leaf:",
    code: "&#127810;",
    category: "n",
    emoji_order: "1447",
    char: "🍂"
  },
  {
    name: "leaves",
    unicode: "1f343",
    shortname: ":leaves:",
    code: "&#127811;",
    category: "n",
    emoji_order: "1448",
    char: "🍃"
  },
  {
    name: "grapes",
    unicode: "1f347",
    shortname: ":grapes:",
    code: "&#127815;",
    category: "d",
    emoji_order: "1449",
    char: "🍇"
  },
  {
    name: "melon",
    unicode: "1f348",
    shortname: ":melon:",
    code: "&#127816;",
    category: "d",
    emoji_order: "1450",
    char: "🍈"
  },
  {
    name: "watermelon",
    unicode: "1f349",
    shortname: ":watermelon:",
    code: "&#127817;",
    category: "d",
    emoji_order: "1451",
    char: "🍉"
  },
  {
    name: "tangerine",
    unicode: "1f34a",
    shortname: ":tangerine:",
    code: "&#127818;",
    category: "d",
    emoji_order: "1452",
    char: "🍊"
  },
  {
    name: "lemon",
    unicode: "1f34b",
    shortname: ":lemon:",
    code: "&#127819;",
    category: "d",
    emoji_order: "1453",
    char: "🍋"
  },
  {
    name: "banana",
    unicode: "1f34c",
    shortname: ":banana:",
    code: "&#127820;",
    category: "d",
    emoji_order: "1454",
    char: "🍌"
  },
  {
    name: "pineapple",
    unicode: "1f34d",
    shortname: ":pineapple:",
    code: "&#127821;",
    category: "d",
    emoji_order: "1455",
    char: "🍍"
  },
  {
    name: "apple",
    unicode: "1f34e",
    shortname: ":apple:",
    code: "&#127822;",
    category: "d",
    emoji_order: "1456",
    char: "🍎"
  },
  {
    name: "green_apple",
    unicode: "1f34f",
    shortname: ":green_apple:",
    code: "&#127823;",
    category: "d",
    emoji_order: "1457",
    char: "🍏"
  },
  {
    name: "pear",
    unicode: "1f350",
    shortname: ":pear:",
    code: "&#127824;",
    category: "d",
    emoji_order: "1458",
    char: "🍐"
  },
  {
    name: "peach",
    unicode: "1f351",
    shortname: ":peach:",
    code: "&#127825;",
    category: "d",
    emoji_order: "1459",
    char: "🍑"
  },
  {
    name: "cherries",
    unicode: "1f352",
    shortname: ":cherries:",
    code: "&#127826;",
    category: "d",
    emoji_order: "1460",
    char: "🍒"
  },
  {
    name: "strawberry",
    unicode: "1f353",
    shortname: ":strawberry:",
    code: "&#127827;",
    category: "d",
    emoji_order: "1461",
    char: "🍓"
  },
  {
    name: "kiwi",
    unicode: "1f95d",
    shortname: ":kiwi:",
    code: "&#129373;",
    category: "d",
    emoji_order: "1462",
    char: "🥝"
  },
  {
    name: "tomato",
    unicode: "1f345",
    shortname: ":tomato:",
    code: "&#127813;",
    category: "d",
    emoji_order: "1463",
    char: "🍅"
  },
  {
    name: "avocado",
    unicode: "1f951",
    shortname: ":avocado:",
    code: "&#129361;",
    category: "d",
    emoji_order: "1464",
    char: "🥑"
  },
  {
    name: "eggplant",
    unicode: "1f346",
    shortname: ":eggplant:",
    code: "&#127814;",
    category: "d",
    emoji_order: "1465",
    char: "🍆"
  },
  {
    name: "potato",
    unicode: "1f954",
    shortname: ":potato:",
    code: "&#129364;",
    category: "d",
    emoji_order: "1466",
    char: "🥔"
  },
  {
    name: "carrot",
    unicode: "1f955",
    shortname: ":carrot:",
    code: "&#129365;",
    category: "d",
    emoji_order: "1467",
    char: "🥕"
  },
  {
    name: "corn",
    unicode: "1f33d",
    shortname: ":corn:",
    code: "&#127805;",
    category: "d",
    emoji_order: "1468",
    char: "🌽"
  },
  {
    name: "hot_pepper",
    unicode: "1f336",
    shortname: ":hot_pepper:",
    code: "&#127798;",
    category: "d",
    emoji_order: "1469",
    char: "🌶"
  },
  {
    name: "cucumber",
    unicode: "1f952",
    shortname: ":cucumber:",
    code: "&#129362;",
    category: "d",
    emoji_order: "1470",
    char: "🥒"
  },
  {
    name: "mushroom",
    unicode: "1f344",
    shortname: ":mushroom:",
    code: "&#127812;",
    category: "n",
    emoji_order: "1471",
    char: "🍄"
  },
  {
    name: "peanuts",
    unicode: "1f95c",
    shortname: ":peanuts:",
    code: "&#129372;",
    category: "d",
    emoji_order: "1472",
    char: "🥜"
  },
  {
    name: "chestnut",
    unicode: "1f330",
    shortname: ":chestnut:",
    code: "&#127792;",
    category: "n",
    emoji_order: "1473",
    char: "🌰"
  },
  {
    name: "bread",
    unicode: "1f35e",
    shortname: ":bread:",
    code: "&#127838;",
    category: "d",
    emoji_order: "1474",
    char: "🍞"
  },
  {
    name: "croissant",
    unicode: "1f950",
    shortname: ":croissant:",
    code: "&#129360;",
    category: "d",
    emoji_order: "1475",
    char: "🥐"
  },
  {
    name: "french_bread",
    unicode: "1f956",
    shortname: ":french_bread:",
    code: "&#129366;",
    category: "d",
    emoji_order: "1476",
    char: "🥖"
  },
  {
    name: "pancakes",
    unicode: "1f95e",
    shortname: ":pancakes:",
    code: "&#129374;",
    category: "d",
    emoji_order: "1477",
    char: "🥞"
  },
  {
    name: "cheese_wedge",
    unicode: "1f9c0",
    shortname: ":cheese:",
    code: "&#129472;",
    category: "d",
    emoji_order: "1478",
    char: "🧀"
  },
  {
    name: "meat_on_bone",
    unicode: "1f356",
    shortname: ":meat_on_bone:",
    code: "&#127830;",
    category: "d",
    emoji_order: "1479",
    char: "🍖"
  },
  {
    name: "poultry_leg",
    unicode: "1f357",
    shortname: ":poultry_leg:",
    code: "&#127831;",
    category: "d",
    emoji_order: "1480",
    char: "🍗"
  },
  {
    name: "bacon",
    unicode: "1f953",
    shortname: ":bacon:",
    code: "&#129363;",
    category: "d",
    emoji_order: "1481",
    char: "🥓"
  },
  {
    name: "hamburger",
    unicode: "1f354",
    shortname: ":hamburger:",
    code: "&#127828;",
    category: "d",
    emoji_order: "1482",
    char: "🍔"
  },
  {
    name: "fries",
    unicode: "1f35f",
    shortname: ":fries:",
    code: "&#127839;",
    category: "d",
    emoji_order: "1483",
    char: "🍟"
  },
  {
    name: "pizza",
    unicode: "1f355",
    shortname: ":pizza:",
    code: "&#127829;",
    category: "d",
    emoji_order: "1484",
    char: "🍕"
  },
  {
    name: "hotdog",
    unicode: "1f32d",
    shortname: ":hotdog:",
    code: "&#127789;",
    category: "d",
    emoji_order: "1485",
    char: "🌭"
  },
  {
    name: "taco",
    unicode: "1f32e",
    shortname: ":taco:",
    code: "&#127790;",
    category: "d",
    emoji_order: "1486",
    char: "🌮"
  },
  {
    name: "burrito",
    unicode: "1f32f",
    shortname: ":burrito:",
    code: "&#127791;",
    category: "d",
    emoji_order: "1487",
    char: "🌯"
  },
  {
    name: "stuffed_flatbread",
    unicode: "1f959",
    shortname: ":stuffed_flatbread:",
    code: "&#129369;",
    category: "d",
    emoji_order: "1488",
    char: "🥙"
  },
  {
    name: "egg",
    unicode: "1f95a",
    shortname: ":egg:",
    code: "&#129370;",
    category: "d",
    emoji_order: "1489",
    char: "🥚"
  },
  {
    name: "cooking",
    unicode: "1f373",
    shortname: ":cooking:",
    code: "&#127859;",
    category: "d",
    emoji_order: "1490",
    char: "🍳"
  },
  {
    name: "shallow_pan_of_f",
    unicode: "1f958",
    shortname: ":shallow_pan_of_f:",
    code: "&#129368;",
    category: "d",
    emoji_order: "1491",
    char: "🥘"
  },
  {
    name: "stew",
    unicode: "1f372",
    shortname: ":stew:",
    code: "&#127858;",
    category: "d",
    emoji_order: "1492",
    char: "🍲"
  },
  {
    name: "salad",
    unicode: "1f957",
    shortname: ":salad:",
    code: "&#129367;",
    category: "d",
    emoji_order: "1493",
    char: "🥗"
  },
  {
    name: "popcorn",
    unicode: "1f37f",
    shortname: ":popcorn:",
    code: "&#127871;",
    category: "d",
    emoji_order: "1494",
    char: "🍿"
  },
  {
    name: "bento",
    unicode: "1f371",
    shortname: ":bento:",
    code: "&#127857;",
    category: "d",
    emoji_order: "1495",
    char: "🍱"
  },
  {
    name: "rice_cracker",
    unicode: "1f358",
    shortname: ":rice_cracker:",
    code: "&#127832;",
    category: "d",
    emoji_order: "1496",
    char: "🍘"
  },
  {
    name: "rice_ball",
    unicode: "1f359",
    shortname: ":rice_ball:",
    code: "&#127833;",
    category: "d",
    emoji_order: "1497",
    char: "🍙"
  },
  {
    name: "rice",
    unicode: "1f35a",
    shortname: ":rice:",
    code: "&#127834;",
    category: "d",
    emoji_order: "1498",
    char: "🍚"
  },
  {
    name: "curry",
    unicode: "1f35b",
    shortname: ":curry:",
    code: "&#127835;",
    category: "d",
    emoji_order: "1499",
    char: "🍛"
  },
  {
    name: "ramen",
    unicode: "1f35c",
    shortname: ":ramen:",
    code: "&#127836;",
    category: "d",
    emoji_order: "1500",
    char: "🍜"
  },
  {
    name: "spaghetti",
    unicode: "1f35d",
    shortname: ":spaghetti:",
    code: "&#127837;",
    category: "d",
    emoji_order: "1501",
    char: "🍝"
  },
  {
    name: "sweet_potato",
    unicode: "1f360",
    shortname: ":sweet_potato:",
    code: "&#127840;",
    category: "d",
    emoji_order: "1502",
    char: "🍠"
  },
  {
    name: "oden",
    unicode: "1f362",
    shortname: ":oden:",
    code: "&#127842;",
    category: "d",
    emoji_order: "1503",
    char: "🍢"
  },
  {
    name: "sushi",
    unicode: "1f363",
    shortname: ":sushi:",
    code: "&#127843;",
    category: "d",
    emoji_order: "1504",
    char: "🍣"
  },
  {
    name: "fried_shrimp",
    unicode: "1f364",
    shortname: ":fried_shrimp:",
    code: "&#127844;",
    category: "d",
    emoji_order: "1505",
    char: "🍤"
  },
  {
    name: "fish_cake",
    unicode: "1f365",
    shortname: ":fish_cake:",
    code: "&#127845;",
    category: "d",
    emoji_order: "1506",
    char: "🍥"
  },
  {
    name: "dango",
    unicode: "1f361",
    shortname: ":dango:",
    code: "&#127841;",
    category: "d",
    emoji_order: "1507",
    char: "🍡"
  },
  {
    name: "icecream",
    unicode: "1f366",
    shortname: ":icecream:",
    code: "&#127846;",
    category: "d",
    emoji_order: "1508",
    char: "🍦"
  },
  {
    name: "shaved_ice",
    unicode: "1f367",
    shortname: ":shaved_ice:",
    code: "&#127847;",
    category: "d",
    emoji_order: "1509",
    char: "🍧"
  },
  {
    name: "ice_cream",
    unicode: "1f368",
    shortname: ":ice_cream:",
    code: "&#127848;",
    category: "d",
    emoji_order: "1510",
    char: "🍨"
  },
  {
    name: "doughnut",
    unicode: "1f369",
    shortname: ":doughnut:",
    code: "&#127849;",
    category: "d",
    emoji_order: "1511",
    char: "🍩"
  },
  {
    name: "cookie",
    unicode: "1f36a",
    shortname: ":cookie:",
    code: "&#127850;",
    category: "d",
    emoji_order: "1512",
    char: "🍪"
  },
  {
    name: "birthday",
    unicode: "1f382",
    shortname: ":birthday:",
    code: "&#127874;",
    category: "d",
    emoji_order: "1513",
    char: "🎂"
  },
  {
    name: "cake",
    unicode: "1f370",
    shortname: ":cake:",
    code: "&#127856;",
    category: "d",
    emoji_order: "1514",
    char: "🍰"
  },
  {
    name: "chocolate_bar",
    unicode: "1f36b",
    shortname: ":chocolate_bar:",
    code: "&#127851;",
    category: "d",
    emoji_order: "1515",
    char: "🍫"
  },
  {
    name: "candy",
    unicode: "1f36c",
    shortname: ":candy:",
    code: "&#127852;",
    category: "d",
    emoji_order: "1516",
    char: "🍬"
  },
  {
    name: "lollipop",
    unicode: "1f36d",
    shortname: ":lollipop:",
    code: "&#127853;",
    category: "d",
    emoji_order: "1517",
    char: "🍭"
  },
  {
    name: "custard",
    unicode: "1f36e",
    shortname: ":custard:",
    code: "&#127854;",
    category: "d",
    emoji_order: "1518",
    char: "🍮"
  },
  {
    name: "honey_pot",
    unicode: "1f36f",
    shortname: ":honey_pot:",
    code: "&#127855;",
    category: "d",
    emoji_order: "1519",
    char: "🍯"
  },
  {
    name: "baby_bottle",
    unicode: "1f37c",
    shortname: ":baby_bottle:",
    code: "&#127868;",
    category: "d",
    emoji_order: "1520",
    char: "🍼"
  },
  {
    name: "milk",
    unicode: "1f95b",
    shortname: ":milk:",
    code: "&#129371;",
    category: "d",
    emoji_order: "1521",
    char: "🥛"
  },
  {
    name: "coffee",
    unicode: "2615",
    shortname: ":coffee:",
    code: "&#9749;",
    category: "d",
    emoji_order: "1522",
    char: "☕"
  },
  {
    name: "tea",
    unicode: "1f375",
    shortname: ":tea:",
    code: "&#127861;",
    category: "d",
    emoji_order: "1523",
    char: "🍵"
  },
  {
    name: "sake",
    unicode: "1f376",
    shortname: ":sake:",
    code: "&#127862;",
    category: "d",
    emoji_order: "1524",
    char: "🍶"
  },
  {
    name: "champagne",
    unicode: "1f37e",
    shortname: ":champagne:",
    code: "&#127870;",
    category: "d",
    emoji_order: "1525",
    char: "🍾"
  },
  {
    name: "wine_glass",
    unicode: "1f377",
    shortname: ":wine_glass:",
    code: "&#127863;",
    category: "d",
    emoji_order: "1526",
    char: "🍷"
  },
  {
    name: "cocktail",
    unicode: "1f378",
    shortname: ":cocktail:",
    code: "&#127864;",
    category: "d",
    emoji_order: "1527",
    char: "🍸"
  },
  {
    name: "tropical_drink",
    unicode: "1f379",
    shortname: ":tropical_drink:",
    code: "&#127865;",
    category: "d",
    emoji_order: "1528",
    char: "🍹"
  },
  {
    name: "beer",
    unicode: "1f37a",
    shortname: ":beer:",
    code: "&#127866;",
    category: "d",
    emoji_order: "1529",
    char: "🍺"
  },
  {
    name: "beers",
    unicode: "1f37b",
    shortname: ":beers:",
    code: "&#127867;",
    category: "d",
    emoji_order: "1530",
    char: "🍻"
  },
  {
    name: "champagne_glass",
    unicode: "1f942",
    shortname: ":champagne_glass:",
    code: "&#129346;",
    category: "d",
    emoji_order: "1531",
    char: "🥂"
  },
  {
    name: "tumbler_glass",
    unicode: "1f943",
    shortname: ":tumbler_glass:",
    code: "&#129347;",
    category: "d",
    emoji_order: "1532",
    char: "🥃"
  },
  {
    name: "knife_fork_plate",
    unicode: "1f37d",
    shortname: ":fork_knife_plate:",
    code: "&#127869;",
    category: "d",
    emoji_order: "1533",
    char: "🍽"
  },
  {
    name: "fork_and_knife",
    unicode: "1f374",
    shortname: ":fork_and_knife:",
    code: "&#127860;",
    category: "d",
    emoji_order: "1534",
    char: "🍴"
  },
  {
    name: "spoon",
    unicode: "1f944",
    shortname: ":spoon:",
    code: "&#129348;",
    category: "d",
    emoji_order: "1535",
    char: "🥄"
  },
  {
    name: "knife",
    unicode: "1f52a",
    shortname: ":knife:",
    code: "&#128298;",
    category: "o",
    emoji_order: "1536",
    char: "🔪"
  },
  {
    name: "amphora",
    unicode: "1f3fa",
    shortname: ":amphora:",
    code: "&#127994;",
    category: "o",
    emoji_order: "1537",
    char: "🏺"
  },
  {
    name: "earth_africa",
    unicode: "1f30d",
    shortname: ":earth_africa:",
    code: "&#127757;",
    category: "n",
    emoji_order: "1538",
    char: "🌍"
  },
  {
    name: "earth_americas",
    unicode: "1f30e",
    shortname: ":earth_americas:",
    code: "&#127758;",
    category: "n",
    emoji_order: "1539",
    char: "🌎"
  },
  {
    name: "earth_asia",
    unicode: "1f30f",
    shortname: ":earth_asia:",
    code: "&#127759;",
    category: "n",
    emoji_order: "1540",
    char: "🌏"
  },
  {
    name: "globe_with_meridians",
    unicode: "1f310",
    shortname: ":globe_with_meridians:",
    code: "&#127760;",
    category: "s",
    emoji_order: "1541",
    char: "🌐"
  },
  {
    name: "world_map",
    unicode: "1f5fa",
    shortname: ":map:",
    code: "&#128506;",
    category: "o",
    emoji_order: "1542",
    char: "🗺"
  },
  {
    name: "japan",
    unicode: "1f5fe",
    shortname: ":japan:",
    code: "&#128510;",
    category: "t",
    emoji_order: "1543",
    char: "🗾"
  },
  {
    name: "snow_capped_mountain",
    unicode: "1f3d4",
    shortname: ":mountain_snow:",
    code: "&#127956;",
    category: "t",
    emoji_order: "1544",
    char: "🏔"
  },
  {
    name: "mountain",
    unicode: "26f0",
    shortname: ":mountain:",
    code: "&#9968;",
    category: "t",
    emoji_order: "1545",
    char: "⛰"
  },
  {
    name: "volcano",
    unicode: "1f30b",
    shortname: ":volcano:",
    code: "&#127755;",
    category: "t",
    emoji_order: "1546",
    char: "🌋"
  },
  {
    name: "mount_fuji",
    unicode: "1f5fb",
    shortname: ":mount_fuji:",
    code: "&#128507;",
    category: "t",
    emoji_order: "1547",
    char: "🗻"
  },
  {
    name: "camping",
    unicode: "1f3d5",
    shortname: ":camping:",
    code: "&#127957;",
    category: "t",
    emoji_order: "1548",
    char: "🏕"
  },
  {
    name: "beach_with_umbrella",
    unicode: "1f3d6",
    shortname: ":beach:",
    code: "&#127958;",
    category: "t",
    emoji_order: "1549",
    char: "🏖"
  },
  {
    name: "desert",
    unicode: "1f3dc",
    shortname: ":desert:",
    code: "&#127964;",
    category: "t",
    emoji_order: "1550",
    char: "🏜"
  },
  {
    name: "desert_island",
    unicode: "1f3dd",
    shortname: ":island:",
    code: "&#127965;",
    category: "t",
    emoji_order: "1551",
    char: "🏝"
  },
  {
    name: "national_park",
    unicode: "1f3de",
    shortname: ":park:",
    code: "&#127966;",
    category: "t",
    emoji_order: "1552",
    char: "🏞"
  },
  {
    name: "stadium",
    unicode: "1f3df",
    shortname: ":stadium:",
    code: "&#127967;",
    category: "t",
    emoji_order: "1553",
    char: "🏟"
  },
  {
    name: "classical_building",
    unicode: "1f3db",
    shortname: ":classical_building:",
    code: "&#127963;",
    category: "t",
    emoji_order: "1554",
    char: "🏛"
  },
  {
    name: "building_construction",
    unicode: "1f3d7",
    shortname: ":construction_site:",
    code: "&#127959;",
    category: "t",
    emoji_order: "1555",
    char: "🏗"
  },
  {
    name: "house_buildings",
    unicode: "1f3d8",
    shortname: ":homes:",
    code: "&#127960;",
    category: "t",
    emoji_order: "1556",
    char: "🏘"
  },
  {
    name: "cityscape",
    unicode: "1f3d9",
    shortname: ":cityscape:",
    code: "&#127961;",
    category: "t",
    emoji_order: "1557",
    char: "🏙"
  },
  {
    name: "derelict_house_building",
    unicode: "1f3da",
    shortname: ":house_abandoned:",
    code: "&#127962;",
    category: "t",
    emoji_order: "1558",
    char: "🏚"
  },
  {
    name: "house",
    unicode: "1f3e0",
    shortname: ":house:",
    code: "&#127968;",
    category: "t",
    emoji_order: "1559",
    char: "🏠"
  },
  {
    name: "house_with_garden",
    unicode: "1f3e1",
    shortname: ":house_with_garden:",
    code: "&#127969;",
    category: "t",
    emoji_order: "1560",
    char: "🏡"
  },
  {
    name: "office",
    unicode: "1f3e2",
    shortname: ":office:",
    code: "&#127970;",
    category: "t",
    emoji_order: "1561",
    char: "🏢"
  },
  {
    name: "post_office",
    unicode: "1f3e3",
    shortname: ":post_office:",
    code: "&#127971;",
    category: "t",
    emoji_order: "1562",
    char: "🏣"
  },
  {
    name: "european_post_office",
    unicode: "1f3e4",
    shortname: ":european_post_office:",
    code: "&#127972;",
    category: "t",
    emoji_order: "1563",
    char: "🏤"
  },
  {
    name: "hospital",
    unicode: "1f3e5",
    shortname: ":hospital:",
    code: "&#127973;",
    category: "t",
    emoji_order: "1564",
    char: "🏥"
  },
  {
    name: "bank",
    unicode: "1f3e6",
    shortname: ":bank:",
    code: "&#127974;",
    category: "t",
    emoji_order: "1565",
    char: "🏦"
  },
  {
    name: "hotel",
    unicode: "1f3e8",
    shortname: ":hotel:",
    code: "&#127976;",
    category: "t",
    emoji_order: "1566",
    char: "🏨"
  },
  {
    name: "love_hotel",
    unicode: "1f3e9",
    shortname: ":love_hotel:",
    code: "&#127977;",
    category: "t",
    emoji_order: "1567",
    char: "🏩"
  },
  {
    name: "convenience_store",
    unicode: "1f3ea",
    shortname: ":convenience_store:",
    code: "&#127978;",
    category: "t",
    emoji_order: "1568",
    char: "🏪"
  },
  {
    name: "school",
    unicode: "1f3eb",
    shortname: ":school:",
    code: "&#127979;",
    category: "t",
    emoji_order: "1569",
    char: "🏫"
  },
  {
    name: "department_store",
    unicode: "1f3ec",
    shortname: ":department_store:",
    code: "&#127980;",
    category: "t",
    emoji_order: "1570",
    char: "🏬"
  },
  {
    name: "factory",
    unicode: "1f3ed",
    shortname: ":factory:",
    code: "&#127981;",
    category: "t",
    emoji_order: "1571",
    char: "🏭"
  },
  {
    name: "japanese_castle",
    unicode: "1f3ef",
    shortname: ":japanese_castle:",
    code: "&#127983;",
    category: "t",
    emoji_order: "1572",
    char: "🏯"
  },
  {
    name: "european_castle",
    unicode: "1f3f0",
    shortname: ":european_castle:",
    code: "&#127984;",
    category: "t",
    emoji_order: "1573",
    char: "🏰"
  },
  {
    name: "wedding",
    unicode: "1f492",
    shortname: ":wedding:",
    code: "&#128146;",
    category: "t",
    emoji_order: "1574",
    char: "💒"
  },
  {
    name: "tokyo_tower",
    unicode: "1f5fc",
    shortname: ":tokyo_tower:",
    code: "&#128508;",
    category: "t",
    emoji_order: "1575",
    char: "🗼"
  },
  {
    name: "statue_of_liberty",
    unicode: "1f5fd",
    shortname: ":statue_of_liberty:",
    code: "&#128509;",
    category: "t",
    emoji_order: "1576",
    char: "🗽"
  },
  {
    name: "church",
    unicode: "26ea",
    shortname: ":church:",
    code: "&#9962;",
    category: "t",
    emoji_order: "1577",
    char: "⛪"
  },
  {
    name: "mosque",
    unicode: "1f54c",
    shortname: ":mosque:",
    code: "&#128332;",
    category: "t",
    emoji_order: "1578",
    char: "🕌"
  },
  {
    name: "synagogue",
    unicode: "1f54d",
    shortname: ":synagogue:",
    code: "&#128333;",
    category: "t",
    emoji_order: "1579",
    char: "🕍"
  },
  {
    name: "shinto_shrine",
    unicode: "26e9",
    shortname: ":shinto_shrine:",
    code: "&#9961;",
    category: "t",
    emoji_order: "1580",
    char: "⛩"
  },
  {
    name: "kaaba",
    unicode: "1f54b",
    shortname: ":kaaba:",
    code: "&#128331;",
    category: "t",
    emoji_order: "1581",
    char: "🕋"
  },
  {
    name: "fountain",
    unicode: "26f2",
    shortname: ":fountain:",
    code: "&#9970;",
    category: "t",
    emoji_order: "1582",
    char: "⛲"
  },
  {
    name: "tent",
    unicode: "26fa",
    shortname: ":tent:",
    code: "&#9978;",
    category: "t",
    emoji_order: "1583",
    char: "⛺"
  },
  {
    name: "foggy",
    unicode: "1f301",
    shortname: ":foggy:",
    code: "&#127745;",
    category: "t",
    emoji_order: "1584",
    char: "🌁"
  },
  {
    name: "night_with_stars",
    unicode: "1f303",
    shortname: ":night_with_stars:",
    code: "&#127747;",
    category: "t",
    emoji_order: "1585",
    char: "🌃"
  },
  {
    name: "sunrise_over_mountains",
    unicode: "1f304",
    shortname: ":sunrise_over_mountains:",
    code: "&#127748;",
    category: "t",
    emoji_order: "1586",
    char: "🌄"
  },
  {
    name: "sunrise",
    unicode: "1f305",
    shortname: ":sunrise:",
    code: "&#127749;",
    category: "t",
    emoji_order: "1587",
    char: "🌅"
  },
  {
    name: "city_dusk",
    unicode: "1f306",
    shortname: ":city_dusk:",
    code: "&#127750;",
    category: "t",
    emoji_order: "1588",
    char: "🌆"
  },
  {
    name: "city_sunset",
    unicode: "1f307",
    shortname: ":city_sunset:",
    code: "&#127751;",
    category: "t",
    emoji_order: "1589",
    char: "🌇"
  },
  {
    name: "bridge_at_night",
    unicode: "1f309",
    shortname: ":bridge_at_night:",
    code: "&#127753;",
    category: "t",
    emoji_order: "1590",
    char: "🌉"
  },
  {
    name: "hotsprings",
    unicode: "2668",
    shortname: ":hotsprings:",
    code: "&#9832;",
    category: "s",
    emoji_order: "1591",
    char: "♨"
  },
  {
    name: "milky_way",
    unicode: "1f30c",
    shortname: ":milky_way:",
    code: "&#127756;",
    category: "t",
    emoji_order: "1592",
    char: "🌌"
  },
  {
    name: "carousel_horse",
    unicode: "1f3a0",
    shortname: ":carousel_horse:",
    code: "&#127904;",
    category: "t",
    emoji_order: "1593",
    char: "🎠"
  },
  {
    name: "ferris_wheel",
    unicode: "1f3a1",
    shortname: ":ferris_wheel:",
    code: "&#127905;",
    category: "t",
    emoji_order: "1594",
    char: "🎡"
  },
  {
    name: "roller_coaster",
    unicode: "1f3a2",
    shortname: ":roller_coaster:",
    code: "&#127906;",
    category: "t",
    emoji_order: "1595",
    char: "🎢"
  },
  {
    name: "barber",
    unicode: "1f488",
    shortname: ":barber:",
    code: "&#128136;",
    category: "o",
    emoji_order: "1596",
    char: "💈"
  },
  {
    name: "circus_tent",
    unicode: "1f3aa",
    shortname: ":circus_tent:",
    code: "&#127914;",
    category: "a",
    emoji_order: "1597",
    char: "🎪"
  },
  {
    name: "performing_arts",
    unicode: "1f3ad",
    shortname: ":performing_arts:",
    code: "&#127917;",
    category: "a",
    emoji_order: "1598",
    char: "🎭"
  },
  {
    name: "frame_with_picture",
    unicode: "1f5bc",
    shortname: ":frame_photo:",
    code: "&#128444;",
    category: "o",
    emoji_order: "1599",
    char: "🖼"
  },
  {
    name: "art",
    unicode: "1f3a8",
    shortname: ":art:",
    code: "&#127912;",
    category: "a",
    emoji_order: "1600",
    char: "🎨"
  },
  {
    name: "slot_machine",
    unicode: "1f3b0",
    shortname: ":slot_machine:",
    code: "&#127920;",
    category: "a",
    emoji_order: "1601",
    char: "🎰"
  },
  {
    name: "steam_locomotive",
    unicode: "1f682",
    shortname: ":steam_locomotive:",
    code: "&#128642;",
    category: "t",
    emoji_order: "1602",
    char: "🚂"
  },
  {
    name: "railway_car",
    unicode: "1f683",
    shortname: ":railway_car:",
    code: "&#128643;",
    category: "t",
    emoji_order: "1603",
    char: "🚃"
  },
  {
    name: "bullettrain_side",
    unicode: "1f684",
    shortname: ":bullettrain_side:",
    code: "&#128644;",
    category: "t",
    emoji_order: "1604",
    char: "🚄"
  },
  {
    name: "bullettrain_front",
    unicode: "1f685",
    shortname: ":bullettrain_front:",
    code: "&#128645;",
    category: "t",
    emoji_order: "1605",
    char: "🚅"
  },
  {
    name: "train2",
    unicode: "1f686",
    shortname: ":train2:",
    code: "&#128646;",
    category: "t",
    emoji_order: "1606",
    char: "🚆"
  },
  {
    name: "metro",
    unicode: "1f687",
    shortname: ":metro:",
    code: "&#128647;",
    category: "t",
    emoji_order: "1607",
    char: "🚇"
  },
  {
    name: "light_rail",
    unicode: "1f688",
    shortname: ":light_rail:",
    code: "&#128648;",
    category: "t",
    emoji_order: "1608",
    char: "🚈"
  },
  {
    name: "station",
    unicode: "1f689",
    shortname: ":station:",
    code: "&#128649;",
    category: "t",
    emoji_order: "1609",
    char: "🚉"
  },
  {
    name: "tram",
    unicode: "1f68a",
    shortname: ":tram:",
    code: "&#128650;",
    category: "t",
    emoji_order: "1610",
    char: "🚊"
  },
  {
    name: "monorail",
    unicode: "1f69d",
    shortname: ":monorail:",
    code: "&#128669;",
    category: "t",
    emoji_order: "1611",
    char: "🚝"
  },
  {
    name: "mountain_railway",
    unicode: "1f69e",
    shortname: ":mountain_railway:",
    code: "&#128670;",
    category: "t",
    emoji_order: "1612",
    char: "🚞"
  },
  {
    name: "train",
    unicode: "1f68b",
    shortname: ":train:",
    code: "&#128651;",
    category: "t",
    emoji_order: "1613",
    char: "🚋"
  },
  {
    name: "bus",
    unicode: "1f68c",
    shortname: ":bus:",
    code: "&#128652;",
    category: "t",
    emoji_order: "1614",
    char: "🚌"
  },
  {
    name: "oncoming_bus",
    unicode: "1f68d",
    shortname: ":oncoming_bus:",
    code: "&#128653;",
    category: "t",
    emoji_order: "1615",
    char: "🚍"
  },
  {
    name: "trolleybus",
    unicode: "1f68e",
    shortname: ":trolleybus:",
    code: "&#128654;",
    category: "t",
    emoji_order: "1616",
    char: "🚎"
  },
  {
    name: "minibus",
    unicode: "1f690",
    shortname: ":minibus:",
    code: "&#128656;",
    category: "t",
    emoji_order: "1617",
    char: "🚐"
  },
  {
    name: "ambulance",
    unicode: "1f691",
    shortname: ":ambulance:",
    code: "&#128657;",
    category: "t",
    emoji_order: "1618",
    char: "🚑"
  },
  {
    name: "fire_engine",
    unicode: "1f692",
    shortname: ":fire_engine:",
    code: "&#128658;",
    category: "t",
    emoji_order: "1619",
    char: "🚒"
  },
  {
    name: "police_car",
    unicode: "1f693",
    shortname: ":police_car:",
    code: "&#128659;",
    category: "t",
    emoji_order: "1620",
    char: "🚓"
  },
  {
    name: "oncoming_police_car",
    unicode: "1f694",
    shortname: ":oncoming_police_car:",
    code: "&#128660;",
    category: "t",
    emoji_order: "1621",
    char: "🚔"
  },
  {
    name: "taxi",
    unicode: "1f695",
    shortname: ":taxi:",
    code: "&#128661;",
    category: "t",
    emoji_order: "1622",
    char: "🚕"
  },
  {
    name: "oncoming_taxi",
    unicode: "1f696",
    shortname: ":oncoming_taxi:",
    code: "&#128662;",
    category: "t",
    emoji_order: "1623",
    char: "🚖"
  },
  {
    name: "car",
    unicode: "1f697",
    shortname: ":red_car:",
    code: "&#128663;",
    category: "t",
    emoji_order: "1624",
    char: "🚗"
  },
  {
    name: "oncoming_automobile",
    unicode: "1f698",
    shortname: ":oncoming_automobile:",
    code: "&#128664;",
    category: "t",
    emoji_order: "1625",
    char: "🚘"
  },
  {
    name: "blue_car",
    unicode: "1f699",
    shortname: ":blue_car:",
    code: "&#128665;",
    category: "t",
    emoji_order: "1626",
    char: "🚙"
  },
  {
    name: "truck",
    unicode: "1f69a",
    shortname: ":truck:",
    code: "&#128666;",
    category: "t",
    emoji_order: "1627",
    char: "🚚"
  },
  {
    name: "articulated_lorry",
    unicode: "1f69b",
    shortname: ":articulated_lorry:",
    code: "&#128667;",
    category: "t",
    emoji_order: "1628",
    char: "🚛"
  },
  {
    name: "tractor",
    unicode: "1f69c",
    shortname: ":tractor:",
    code: "&#128668;",
    category: "t",
    emoji_order: "1629",
    char: "🚜"
  },
  {
    name: "bike",
    unicode: "1f6b2",
    shortname: ":bike:",
    code: "&#128690;",
    category: "t",
    emoji_order: "1630",
    char: "🚲"
  },
  {
    name: "scooter",
    unicode: "1f6f4",
    shortname: ":scooter:",
    code: "&#128756;",
    category: "t",
    emoji_order: "1631",
    char: "🛴"
  },
  {
    name: "motor_scooter",
    unicode: "1f6f5",
    shortname: ":motor_scooter:",
    code: "&#128757;",
    category: "t",
    emoji_order: "1632",
    char: "🛵"
  },
  {
    name: "busstop",
    unicode: "1f68f",
    shortname: ":busstop:",
    code: "&#128655;",
    category: "t",
    emoji_order: "1633",
    char: "🚏"
  },
  {
    name: "motorway",
    unicode: "1f6e3",
    shortname: ":motorway:",
    code: "&#128739;",
    category: "t",
    emoji_order: "1634",
    char: "🛣"
  },
  {
    name: "railway_track",
    unicode: "1f6e4",
    shortname: ":railway_track:",
    code: "&#128740;",
    category: "t",
    emoji_order: "1635",
    char: "🛤"
  },
  {
    name: "fuelpump",
    unicode: "26fd",
    shortname: ":fuelpump:",
    code: "&#9981;",
    category: "t",
    emoji_order: "1636",
    char: "⛽"
  },
  {
    name: "rotating_light",
    unicode: "1f6a8",
    shortname: ":rotating_light:",
    code: "&#128680;",
    category: "t",
    emoji_order: "1637",
    char: "🚨"
  },
  {
    name: "traffic_light",
    unicode: "1f6a5",
    shortname: ":traffic_light:",
    code: "&#128677;",
    category: "t",
    emoji_order: "1638",
    char: "🚥"
  },
  {
    name: "vertical_traffic_light",
    unicode: "1f6a6",
    shortname: ":vertical_traffic_light:",
    code: "&#128678;",
    category: "t",
    emoji_order: "1639",
    char: "🚦"
  },
  {
    name: "construction",
    unicode: "1f6a7",
    shortname: ":construction:",
    code: "&#128679;",
    category: "t",
    emoji_order: "1640",
    char: "🚧"
  },
  {
    name: "octagonal_sign",
    unicode: "1f6d1",
    shortname: ":octagonal_sign:",
    code: "&#128721;",
    category: "s",
    emoji_order: "1641",
    char: "🛑"
  },
  {
    name: "anchor",
    unicode: "2693",
    shortname: ":anchor:",
    code: "&#9875;",
    category: "t",
    emoji_order: "1642",
    char: "⚓"
  },
  {
    name: "boat",
    unicode: "26f5",
    shortname: ":sailboat:",
    code: "&#9973;",
    category: "t",
    emoji_order: "1643",
    char: "⛵"
  },
  {
    name: "canoe",
    unicode: "1f6f6",
    shortname: ":canoe:",
    code: "&#128758;",
    category: "t",
    emoji_order: "1644",
    char: "🛶"
  },
  {
    name: "speedboat",
    unicode: "1f6a4",
    shortname: ":speedboat:",
    code: "&#128676;",
    category: "t",
    emoji_order: "1645",
    char: "🚤"
  },
  {
    name: "passenger_ship",
    unicode: "1f6f3",
    shortname: ":cruise_ship:",
    code: "&#128755;",
    category: "t",
    emoji_order: "1646",
    char: "🛳"
  },
  {
    name: "ferry",
    unicode: "26f4",
    shortname: ":ferry:",
    code: "&#9972;",
    category: "t",
    emoji_order: "1647",
    char: "⛴"
  },
  {
    name: "motor_boat",
    unicode: "1f6e5",
    shortname: ":motorboat:",
    code: "&#128741;",
    category: "t",
    emoji_order: "1648",
    char: "🛥"
  },
  {
    name: "ship",
    unicode: "1f6a2",
    shortname: ":ship:",
    code: "&#128674;",
    category: "t",
    emoji_order: "1649",
    char: "🚢"
  },
  {
    name: "airplane",
    unicode: "2708",
    shortname: ":airplane:",
    code: "&#9992;",
    category: "t",
    emoji_order: "1650",
    char: "✈"
  },
  {
    name: "small_airplane",
    unicode: "1f6e9",
    shortname: ":airplane_small:",
    code: "&#128745;",
    category: "t",
    emoji_order: "1651",
    char: "🛩"
  },
  {
    name: "airplane_departure",
    unicode: "1f6eb",
    shortname: ":airplane_departure:",
    code: "&#128747;",
    category: "t",
    emoji_order: "1652",
    char: "🛫"
  },
  {
    name: "airplane_arriving",
    unicode: "1f6ec",
    shortname: ":airplane_arriving:",
    code: "&#128748;",
    category: "t",
    emoji_order: "1653",
    char: "🛬"
  },
  {
    name: "seat",
    unicode: "1f4ba",
    shortname: ":seat:",
    code: "&#128186;",
    category: "t",
    emoji_order: "1654",
    char: "💺"
  },
  {
    name: "helicopter",
    unicode: "1f681",
    shortname: ":helicopter:",
    code: "&#128641;",
    category: "t",
    emoji_order: "1655",
    char: "🚁"
  },
  {
    name: "suspension_railway",
    unicode: "1f69f",
    shortname: ":suspension_railway:",
    code: "&#128671;",
    category: "t",
    emoji_order: "1656",
    char: "🚟"
  },
  {
    name: "mountain_cableway",
    unicode: "1f6a0",
    shortname: ":mountain_cableway:",
    code: "&#128672;",
    category: "t",
    emoji_order: "1657",
    char: "🚠"
  },
  {
    name: "aerial_tramway",
    unicode: "1f6a1",
    shortname: ":aerial_tramway:",
    code: "&#128673;",
    category: "t",
    emoji_order: "1658",
    char: "🚡"
  },
  {
    name: "rocket",
    unicode: "1f680",
    shortname: ":rocket:",
    code: "&#128640;",
    category: "t",
    emoji_order: "1659",
    char: "🚀"
  },
  {
    name: "satellite",
    unicode: "1f6f0",
    shortname: ":satellite_orbital:",
    code: "&#128752;",
    category: "t",
    emoji_order: "1660",
    char: "🛰"
  },
  {
    name: "bellhop_bell",
    unicode: "1f6ce",
    shortname: ":bellhop:",
    code: "&#128718;",
    category: "o",
    emoji_order: "1661",
    char: "🛎"
  },
  {
    name: "door",
    unicode: "1f6aa",
    shortname: ":door:",
    code: "&#128682;",
    category: "o",
    emoji_order: "1662",
    char: "🚪"
  },
  {
    name: "sleeping_accommodation",
    unicode: "1f6cc",
    shortname: ":sleeping_accommodation:",
    code: "&#128716;",
    category: "o",
    emoji_order: "1663",
    char: "🛌"
  },
  {
    name: "bed",
    unicode: "1f6cf",
    shortname: ":bed:",
    code: "&#128719;",
    category: "o",
    emoji_order: "1669",
    char: "🛏"
  },
  {
    name: "couch_and_lamp",
    unicode: "1f6cb",
    shortname: ":couch:",
    code: "&#128715;",
    category: "o",
    emoji_order: "1670",
    char: "🛋"
  },
  {
    name: "toilet",
    unicode: "1f6bd",
    shortname: ":toilet:",
    code: "&#128701;",
    category: "o",
    emoji_order: "1671",
    char: "🚽"
  },
  {
    name: "shower",
    unicode: "1f6bf",
    shortname: ":shower:",
    code: "&#128703;",
    category: "o",
    emoji_order: "1672",
    char: "🚿"
  },
  {
    name: "bath",
    unicode: "1f6c0",
    shortname: ":bath:",
    code: "&#128704;",
    category: "a",
    emoji_order: "1673",
    char: "🛀"
  },
  {
    name: "bathtub",
    unicode: "1f6c1",
    shortname: ":bathtub:",
    code: "&#128705;",
    category: "o",
    emoji_order: "1679",
    char: "🛁"
  },
  {
    name: "hourglass",
    unicode: "231b",
    shortname: ":hourglass:",
    code: "&#8987;",
    category: "o",
    emoji_order: "1680",
    char: "⌛"
  },
  {
    name: "hourglass_flowing_sand",
    unicode: "23f3",
    shortname: ":hourglass_flowing_sand:",
    code: "&#9203;",
    category: "o",
    emoji_order: "1681",
    char: "⏳"
  },
  {
    name: "watch",
    unicode: "231a",
    shortname: ":watch:",
    code: "&#8986;",
    category: "o",
    emoji_order: "1682",
    char: "⌚"
  },
  {
    name: "alarm_clock",
    unicode: "23f0",
    shortname: ":alarm_clock:",
    code: "&#9200;",
    category: "o",
    emoji_order: "1683",
    char: "⏰"
  },
  {
    name: "stopwatch",
    unicode: "23f1",
    shortname: ":stopwatch:",
    code: "&#9201;",
    category: "o",
    emoji_order: "1684",
    char: "⏱"
  },
  {
    name: "timer_clock",
    unicode: "23f2",
    shortname: ":timer:",
    code: "&#9202;",
    category: "o",
    emoji_order: "1685",
    char: "⏲"
  },
  {
    name: "mantelpiece_clock",
    unicode: "1f570",
    shortname: ":clock:",
    code: "&#128368;",
    category: "o",
    emoji_order: "1686",
    char: "🕰"
  },
  {
    name: "clock12",
    unicode: "1f55b",
    shortname: ":clock12:",
    code: "&#128347;",
    category: "s",
    emoji_order: "1687",
    char: "🕛"
  },
  {
    name: "clock1230",
    unicode: "1f567",
    shortname: ":clock1230:",
    code: "&#128359;",
    category: "s",
    emoji_order: "1688",
    char: "🕧"
  },
  {
    name: "clock1",
    unicode: "1f550",
    shortname: ":clock1:",
    code: "&#128336;",
    category: "s",
    emoji_order: "1689",
    char: "🕐"
  },
  {
    name: "clock130",
    unicode: "1f55c",
    shortname: ":clock130:",
    code: "&#128348;",
    category: "s",
    emoji_order: "1690",
    char: "🕜"
  },
  {
    name: "clock2",
    unicode: "1f551",
    shortname: ":clock2:",
    code: "&#128337;",
    category: "s",
    emoji_order: "1691",
    char: "🕑"
  },
  {
    name: "clock230",
    unicode: "1f55d",
    shortname: ":clock230:",
    code: "&#128349;",
    category: "s",
    emoji_order: "1692",
    char: "🕝"
  },
  {
    name: "clock3",
    unicode: "1f552",
    shortname: ":clock3:",
    code: "&#128338;",
    category: "s",
    emoji_order: "1693",
    char: "🕒"
  },
  {
    name: "clock330",
    unicode: "1f55e",
    shortname: ":clock330:",
    code: "&#128350;",
    category: "s",
    emoji_order: "1694",
    char: "🕞"
  },
  {
    name: "clock4",
    unicode: "1f553",
    shortname: ":clock4:",
    code: "&#128339;",
    category: "s",
    emoji_order: "1695",
    char: "🕓"
  },
  {
    name: "clock430",
    unicode: "1f55f",
    shortname: ":clock430:",
    code: "&#128351;",
    category: "s",
    emoji_order: "1696",
    char: "🕟"
  },
  {
    name: "clock5",
    unicode: "1f554",
    shortname: ":clock5:",
    code: "&#128340;",
    category: "s",
    emoji_order: "1697",
    char: "🕔"
  },
  {
    name: "clock530",
    unicode: "1f560",
    shortname: ":clock530:",
    code: "&#128352;",
    category: "s",
    emoji_order: "1698",
    char: "🕠"
  },
  {
    name: "clock6",
    unicode: "1f555",
    shortname: ":clock6:",
    code: "&#128341;",
    category: "s",
    emoji_order: "1699",
    char: "🕕"
  },
  {
    name: "clock630",
    unicode: "1f561",
    shortname: ":clock630:",
    code: "&#128353;",
    category: "s",
    emoji_order: "1700",
    char: "🕡"
  },
  {
    name: "clock7",
    unicode: "1f556",
    shortname: ":clock7:",
    code: "&#128342;",
    category: "s",
    emoji_order: "1701",
    char: "🕖"
  },
  {
    name: "clock730",
    unicode: "1f562",
    shortname: ":clock730:",
    code: "&#128354;",
    category: "s",
    emoji_order: "1702",
    char: "🕢"
  },
  {
    name: "clock8",
    unicode: "1f557",
    shortname: ":clock8:",
    code: "&#128343;",
    category: "s",
    emoji_order: "1703",
    char: "🕗"
  },
  {
    name: "clock830",
    unicode: "1f563",
    shortname: ":clock830:",
    code: "&#128355;",
    category: "s",
    emoji_order: "1704",
    char: "🕣"
  },
  {
    name: "clock9",
    unicode: "1f558",
    shortname: ":clock9:",
    code: "&#128344;",
    category: "s",
    emoji_order: "1705",
    char: "🕘"
  },
  {
    name: "clock930",
    unicode: "1f564",
    shortname: ":clock930:",
    code: "&#128356;",
    category: "s",
    emoji_order: "1706",
    char: "🕤"
  },
  {
    name: "clock10",
    unicode: "1f559",
    shortname: ":clock10:",
    code: "&#128345;",
    category: "s",
    emoji_order: "1707",
    char: "🕙"
  },
  {
    name: "clock1030",
    unicode: "1f565",
    shortname: ":clock1030:",
    code: "&#128357;",
    category: "s",
    emoji_order: "1708",
    char: "🕥"
  },
  {
    name: "clock11",
    unicode: "1f55a",
    shortname: ":clock11:",
    code: "&#128346;",
    category: "s",
    emoji_order: "1709",
    char: "🕚"
  },
  {
    name: "clock1130",
    unicode: "1f566",
    shortname: ":clock1130:",
    code: "&#128358;",
    category: "s",
    emoji_order: "1710",
    char: "🕦"
  },
  {
    name: "new_moon",
    unicode: "1f311",
    shortname: ":new_moon:",
    code: "&#127761;",
    category: "n",
    emoji_order: "1711",
    char: "🌑"
  },
  {
    name: "waxing_crescent_moon",
    unicode: "1f312",
    shortname: ":waxing_crescent_moon:",
    code: "&#127762;",
    category: "n",
    emoji_order: "1712",
    char: "🌒"
  },
  {
    name: "first_quarter_moon",
    unicode: "1f313",
    shortname: ":first_quarter_moon:",
    code: "&#127763;",
    category: "n",
    emoji_order: "1713",
    char: "🌓"
  },
  {
    name: "waxing_gibbous_moon",
    unicode: "1f314",
    shortname: ":waxing_gibbous_moon:",
    code: "&#127764;",
    category: "n",
    emoji_order: "1714",
    char: "🌔"
  },
  {
    name: "full_moon",
    unicode: "1f315",
    shortname: ":full_moon:",
    code: "&#127765;",
    category: "n",
    emoji_order: "1715",
    char: "🌕"
  },
  {
    name: "waning_gibbous_moon",
    unicode: "1f316",
    shortname: ":waning_gibbous_moon:",
    code: "&#127766;",
    category: "n",
    emoji_order: "1716",
    char: "🌖"
  },
  {
    name: "last_quarter_moon",
    unicode: "1f317",
    shortname: ":last_quarter_moon:",
    code: "&#127767;",
    category: "n",
    emoji_order: "1717",
    char: "🌗"
  },
  {
    name: "waning_crescent_moon",
    unicode: "1f318",
    shortname: ":waning_crescent_moon:",
    code: "&#127768;",
    category: "n",
    emoji_order: "1718",
    char: "🌘"
  },
  {
    name: "crescent_moon",
    unicode: "1f319",
    shortname: ":crescent_moon:",
    code: "&#127769;",
    category: "n",
    emoji_order: "1719",
    char: "🌙"
  },
  {
    name: "new_moon_with_face",
    unicode: "1f31a",
    shortname: ":new_moon_with_face:",
    code: "&#127770;",
    category: "n",
    emoji_order: "1720",
    char: "🌚"
  },
  {
    name: "first_quarter_moon_with_face",
    unicode: "1f31b",
    shortname: ":first_quarter_moon_with_face:",
    code: "&#127771;",
    category: "n",
    emoji_order: "1721",
    char: "🌛"
  },
  {
    name: "last_quarter_moon_with_face",
    unicode: "1f31c",
    shortname: ":last_quarter_moon_with_face:",
    code: "&#127772;",
    category: "n",
    emoji_order: "1722",
    char: "🌜"
  },
  {
    name: "thermometer",
    unicode: "1f321",
    shortname: ":thermometer:",
    code: "&#127777;",
    category: "o",
    emoji_order: "1723",
    char: "🌡"
  },
  {
    name: "sunny",
    unicode: "2600",
    shortname: ":sunny:",
    code: "&#9728;",
    category: "n",
    emoji_order: "1724",
    char: "☀"
  },
  {
    name: "full_moon_with_face",
    unicode: "1f31d",
    shortname: ":full_moon_with_face:",
    code: "&#127773;",
    category: "n",
    emoji_order: "1725",
    char: "🌝"
  },
  {
    name: "sun_with_face",
    unicode: "1f31e",
    shortname: ":sun_with_face:",
    code: "&#127774;",
    category: "n",
    emoji_order: "1726",
    char: "🌞"
  },
  {
    name: "star",
    unicode: "2b50",
    shortname: ":star:",
    code: "&#11088;",
    category: "n",
    emoji_order: "1727",
    char: "⭐"
  },
  {
    name: "star2",
    unicode: "1f31f",
    shortname: ":star2:",
    code: "&#127775;",
    category: "n",
    emoji_order: "1728",
    char: "🌟"
  },
  {
    name: "stars",
    unicode: "1f320",
    shortname: ":stars:",
    code: "&#127776;",
    category: "t",
    emoji_order: "1729",
    char: "🌠"
  },
  {
    name: "cloud",
    unicode: "2601",
    shortname: ":cloud:",
    code: "&#9729;",
    category: "n",
    emoji_order: "1730",
    char: "☁"
  },
  {
    name: "partly_sunny",
    unicode: "26c5",
    shortname: ":partly_sunny:",
    code: "&#9925;",
    category: "n",
    emoji_order: "1731",
    char: "⛅"
  },
  {
    name: "thunder_cloud_and_rain",
    unicode: "26c8",
    shortname: ":thunder_cloud_rain:",
    code: "&#9928;",
    category: "n",
    emoji_order: "1732",
    char: "⛈"
  },
  {
    name: "white_sun_small_cloud",
    unicode: "1f324",
    shortname: ":white_sun_small_cloud:",
    code: "&#127780;",
    category: "n",
    emoji_order: "1733",
    char: "🌤"
  },
  {
    name: "white_sun_cloud",
    unicode: "1f325",
    shortname: ":white_sun_cloud:",
    code: "&#127781;",
    category: "n",
    emoji_order: "1734",
    char: "🌥"
  },
  {
    name: "white_sun_rain_cloud",
    unicode: "1f326",
    shortname: ":white_sun_rain_cloud:",
    code: "&#127782;",
    category: "n",
    emoji_order: "1735",
    char: "🌦"
  },
  {
    name: "rain_cloud",
    unicode: "1f327",
    shortname: ":cloud_rain:",
    code: "&#127783;",
    category: "n",
    emoji_order: "1736",
    char: "🌧"
  },
  {
    name: "snow_cloud",
    unicode: "1f328",
    shortname: ":cloud_snow:",
    code: "&#127784;",
    category: "n",
    emoji_order: "1737",
    char: "🌨"
  },
  {
    name: "cloud_lightning",
    unicode: "1f329",
    shortname: ":cloud_lightning:",
    code: "&#127785;",
    category: "n",
    emoji_order: "1738",
    char: "🌩"
  },
  {
    name: "cloud_tornado",
    unicode: "1f32a",
    shortname: ":cloud_tornado:",
    code: "&#127786;",
    category: "n",
    emoji_order: "1739",
    char: "🌪"
  },
  {
    name: "fog",
    unicode: "1f32b",
    shortname: ":fog:",
    code: "&#127787;",
    category: "n",
    emoji_order: "1740",
    char: "🌫"
  },
  {
    name: "wind_blowing_face",
    unicode: "1f32c",
    shortname: ":wind_blowing_face:",
    code: "&#127788;",
    category: "n",
    emoji_order: "1741",
    char: "🌬"
  },
  {
    name: "cyclone",
    unicode: "1f300",
    shortname: ":cyclone:",
    code: "&#127744;",
    category: "s",
    emoji_order: "1742",
    char: "🌀"
  },
  {
    name: "rainbow",
    unicode: "1f308",
    shortname: ":rainbow:",
    code: "&#127752;",
    category: "t",
    emoji_order: "1743",
    char: "🌈"
  },
  {
    name: "closed_umbrella",
    unicode: "1f302",
    shortname: ":closed_umbrella:",
    code: "&#127746;",
    category: "p",
    emoji_order: "1744",
    char: "🌂"
  },
  {
    name: "umbrella",
    unicode: "2602",
    shortname: ":umbrella2:",
    code: "&#9730;",
    category: "n",
    emoji_order: "1745",
    char: "☂"
  },
  {
    name: "umbrella_with_rain_drops",
    unicode: "2614",
    shortname: ":umbrella:",
    code: "&#9748;",
    category: "n",
    emoji_order: "1746",
    char: "☔"
  },
  {
    name: "beach_umbrella",
    unicode: "26f1",
    shortname: ":beach_umbrella:",
    code: "&#9969;",
    category: "o",
    emoji_order: "1747",
    char: "⛱"
  },
  { name: "zap", unicode: "26a1", shortname: ":zap:", code: "&#9889;", category: "n", emoji_order: "1748", char: "⚡" },
  {
    name: "snowflake",
    unicode: "2744",
    shortname: ":snowflake:",
    code: "&#10052;",
    category: "n",
    emoji_order: "1749",
    char: "❄"
  },
  {
    name: "snowman",
    unicode: "2603",
    shortname: ":snowman2:",
    code: "&#9731;",
    category: "n",
    emoji_order: "1750",
    char: "☃"
  },
  {
    name: "snowman_without_snow",
    unicode: "26c4",
    shortname: ":snowman:",
    code: "&#9924;",
    category: "n",
    emoji_order: "1751",
    char: "⛄"
  },
  {
    name: "comet",
    unicode: "2604",
    shortname: ":comet:",
    code: "&#9732;",
    category: "n",
    emoji_order: "1752",
    char: "☄"
  },
  {
    name: "fire",
    unicode: "1f525",
    shortname: ":fire:",
    code: "&#128293;",
    category: "n",
    emoji_order: "1753",
    char: "🔥"
  },
  {
    name: "droplet",
    unicode: "1f4a7",
    shortname: ":droplet:",
    code: "&#128167;",
    category: "n",
    emoji_order: "1754",
    char: "💧"
  },
  {
    name: "ocean",
    unicode: "1f30a",
    shortname: ":ocean:",
    code: "&#127754;",
    category: "n",
    emoji_order: "1755",
    char: "🌊"
  },
  {
    name: "jack_o_lantern",
    unicode: "1f383",
    shortname: ":jack_o_lantern:",
    code: "&#127875;",
    category: "n",
    emoji_order: "1756",
    char: "🎃"
  },
  {
    name: "christmas_tree",
    unicode: "1f384",
    shortname: ":christmas_tree:",
    code: "&#127876;",
    category: "n",
    emoji_order: "1757",
    char: "🎄"
  },
  {
    name: "fireworks",
    unicode: "1f386",
    shortname: ":fireworks:",
    code: "&#127878;",
    category: "t",
    emoji_order: "1758",
    char: "🎆"
  },
  {
    name: "sparkler",
    unicode: "1f387",
    shortname: ":sparkler:",
    code: "&#127879;",
    category: "t",
    emoji_order: "1759",
    char: "🎇"
  },
  {
    name: "sparkles",
    unicode: "2728",
    shortname: ":sparkles:",
    code: "&#10024;",
    category: "n",
    emoji_order: "1760",
    char: "✨"
  },
  {
    name: "balloon",
    unicode: "1f388",
    shortname: ":balloon:",
    code: "&#127880;",
    category: "o",
    emoji_order: "1761",
    char: "🎈"
  },
  {
    name: "tada",
    unicode: "1f389",
    shortname: ":tada:",
    code: "&#127881;",
    category: "o",
    emoji_order: "1762",
    char: "🎉"
  },
  {
    name: "confetti_ball",
    unicode: "1f38a",
    shortname: ":confetti_ball:",
    code: "&#127882;",
    category: "o",
    emoji_order: "1763",
    char: "🎊"
  },
  {
    name: "tanabata_tree",
    unicode: "1f38b",
    shortname: ":tanabata_tree:",
    code: "&#127883;",
    category: "n",
    emoji_order: "1764",
    char: "🎋"
  },
  {
    name: "bamboo",
    unicode: "1f38d",
    shortname: ":bamboo:",
    code: "&#127885;",
    category: "n",
    emoji_order: "1765",
    char: "🎍"
  },
  {
    name: "dolls",
    unicode: "1f38e",
    shortname: ":dolls:",
    code: "&#127886;",
    category: "o",
    emoji_order: "1766",
    char: "🎎"
  },
  {
    name: "f",
    unicode: "1f38f",
    shortname: ":flags:",
    code: "&#127887;",
    category: "o",
    emoji_order: "1767",
    char: "🎏"
  },
  {
    name: "wind_chime",
    unicode: "1f390",
    shortname: ":wind_chime:",
    code: "&#127888;",
    category: "o",
    emoji_order: "1768",
    char: "🎐"
  },
  {
    name: "rice_scene",
    unicode: "1f391",
    shortname: ":rice_scene:",
    code: "&#127889;",
    category: "t",
    emoji_order: "1769",
    char: "🎑"
  },
  {
    name: "ribbon",
    unicode: "1f380",
    shortname: ":ribbon:",
    code: "&#127872;",
    category: "o",
    emoji_order: "1770",
    char: "🎀"
  },
  {
    name: "gift",
    unicode: "1f381",
    shortname: ":gift:",
    code: "&#127873;",
    category: "o",
    emoji_order: "1771",
    char: "🎁"
  },
  {
    name: "reminder_ribbon",
    unicode: "1f397",
    shortname: ":reminder_ribbon:",
    code: "&#127895;",
    category: "a",
    emoji_order: "1772",
    char: "🎗"
  },
  {
    name: "admission_tickets",
    unicode: "1f39f",
    shortname: ":tickets:",
    code: "&#127903;",
    category: "a",
    emoji_order: "1773",
    char: "🎟"
  },
  {
    name: "ticket",
    unicode: "1f3ab",
    shortname: ":ticket:",
    code: "&#127915;",
    category: "a",
    emoji_order: "1774",
    char: "🎫"
  },
  {
    name: "medal",
    unicode: "1f396",
    shortname: ":military_medal:",
    code: "&#127894;",
    category: "a",
    emoji_order: "1775",
    char: "🎖"
  },
  {
    name: "trophy",
    unicode: "1f3c6",
    shortname: ":trophy:",
    code: "&#127942;",
    category: "a",
    emoji_order: "1776",
    char: "🏆"
  },
  {
    name: "sports_medal",
    unicode: "1f3c5",
    shortname: ":medal:",
    code: "&#127941;",
    category: "a",
    emoji_order: "1777",
    char: "🏅"
  },
  {
    name: "first_place",
    unicode: "1f947",
    shortname: ":first_place:",
    code: "&#129351;",
    category: "a",
    emoji_order: "1778",
    char: "🥇"
  },
  {
    name: "second_place",
    unicode: "1f948",
    shortname: ":second_place:",
    code: "&#129352;",
    category: "a",
    emoji_order: "1779",
    char: "🥈"
  },
  {
    name: "third_place",
    unicode: "1f949",
    shortname: ":third_place:",
    code: "&#129353;",
    category: "a",
    emoji_order: "1780",
    char: "🥉"
  },
  {
    name: "soccer",
    unicode: "26bd",
    shortname: ":soccer:",
    code: "&#9917;",
    category: "a",
    emoji_order: "1781",
    char: "⚽"
  },
  {
    name: "baseball",
    unicode: "26be",
    shortname: ":baseball:",
    code: "&#9918;",
    category: "a",
    emoji_order: "1782",
    char: "⚾"
  },
  {
    name: "basketball",
    unicode: "1f3c0",
    shortname: ":basketball:",
    code: "&#127936;",
    category: "a",
    emoji_order: "1783",
    char: "🏀"
  },
  {
    name: "volleyball",
    unicode: "1f3d0",
    shortname: ":volleyball:",
    code: "&#127952;",
    category: "a",
    emoji_order: "1784",
    char: "🏐"
  },
  {
    name: "football",
    unicode: "1f3c8",
    shortname: ":football:",
    code: "&#127944;",
    category: "a",
    emoji_order: "1785",
    char: "🏈"
  },
  {
    name: "rugby_football",
    unicode: "1f3c9",
    shortname: ":rugby_football:",
    code: "&#127945;",
    category: "a",
    emoji_order: "1786",
    char: "🏉"
  },
  {
    name: "tennis",
    unicode: "1f3be",
    shortname: ":tennis:",
    code: "&#127934;",
    category: "a",
    emoji_order: "1787",
    char: "🎾"
  },
  {
    name: "8ball",
    unicode: "1f3b1",
    shortname: ":8ball:",
    code: "&#127921;",
    category: "a",
    emoji_order: "1788",
    char: "🎱"
  },
  {
    name: "bowling",
    unicode: "1f3b3",
    shortname: ":bowling:",
    code: "&#127923;",
    category: "a",
    emoji_order: "1789",
    char: "🎳"
  },
  {
    name: "cricket_bat_and_ball",
    unicode: "1f3cf",
    shortname: ":cricket_game:",
    code: "&#127951;",
    category: "a",
    emoji_order: "1790",
    char: "🏏"
  },
  {
    name: "field_hockey_stick_and_ball",
    unicode: "1f3d1",
    shortname: ":field_hockey:",
    code: "&#127953;",
    category: "a",
    emoji_order: "1791",
    char: "🏑"
  },
  {
    name: "ice_hockey_stick_and_puck",
    unicode: "1f3d2",
    shortname: ":hockey:",
    code: "&#127954;",
    category: "a",
    emoji_order: "1792",
    char: "🏒"
  },
  {
    name: "table_tennis_paddle_and_ball",
    unicode: "1f3d3",
    shortname: ":ping_pong:",
    code: "&#127955;",
    category: "a",
    emoji_order: "1793",
    char: "🏓"
  },
  {
    name: "badminton_racquet_and_shuttlecock",
    unicode: "1f3f8",
    shortname: ":badminton:",
    code: "&#127992;",
    category: "a",
    emoji_order: "1794",
    char: "🏸"
  },
  {
    name: "boxing_glove",
    unicode: "1f94a",
    shortname: ":boxing_glove:",
    code: "&#129354;",
    category: "a",
    emoji_order: "1795",
    char: "🥊"
  },
  {
    name: "martial_arts_uniform",
    unicode: "1f94b",
    shortname: ":martial_arts_uniform:",
    code: "&#129355;",
    category: "a",
    emoji_order: "1796",
    char: "🥋"
  },
  {
    name: "goal",
    unicode: "1f945",
    shortname: ":goal:",
    code: "&#129349;",
    category: "a",
    emoji_order: "1797",
    char: "🥅"
  },
  {
    name: "dart",
    unicode: "1f3af",
    shortname: ":dart:",
    code: "&#127919;",
    category: "a",
    emoji_order: "1798",
    char: "🎯"
  },
  {
    name: "golf",
    unicode: "26f3",
    shortname: ":golf:",
    code: "&#9971;",
    category: "a",
    emoji_order: "1799",
    char: "⛳"
  },
  {
    name: "ice_skate",
    unicode: "26f8",
    shortname: ":ice_skate:",
    code: "&#9976;",
    category: "a",
    emoji_order: "1800",
    char: "⛸"
  },
  {
    name: "fishing_pole_and_fish",
    unicode: "1f3a3",
    shortname: ":fishing_pole_and_fish:",
    code: "&#127907;",
    category: "a",
    emoji_order: "1801",
    char: "🎣"
  },
  {
    name: "running_shirt_with_sash",
    unicode: "1f3bd",
    shortname: ":running_shirt_with_sash:",
    code: "&#127933;",
    category: "a",
    emoji_order: "1802",
    char: "🎽"
  },
  {
    name: "ski",
    unicode: "1f3bf",
    shortname: ":ski:",
    code: "&#127935;",
    category: "a",
    emoji_order: "1803",
    char: "🎿"
  },
  {
    name: "video_game",
    unicode: "1f3ae",
    shortname: ":video_game:",
    code: "&#127918;",
    category: "a",
    emoji_order: "1804",
    char: "🎮"
  },
  {
    name: "joystick",
    unicode: "1f579",
    shortname: ":joystick:",
    code: "&#128377;",
    category: "o",
    emoji_order: "1805",
    char: "🕹"
  },
  {
    name: "game_die",
    unicode: "1f3b2",
    shortname: ":game_die:",
    code: "&#127922;",
    category: "a",
    emoji_order: "1806",
    char: "🎲"
  },
  {
    name: "spades",
    unicode: "2660",
    shortname: ":spades:",
    code: "&spades;",
    category: "s",
    emoji_order: "1807",
    char: "&spades;"
  },
  {
    name: "hearts",
    unicode: "2665",
    shortname: ":hearts:",
    code: "&hearts;",
    category: "s",
    emoji_order: "1808",
    char: "&hearts;"
  },
  {
    name: "diamonds",
    unicode: "2666",
    shortname: ":diamonds:",
    code: "&diams;",
    category: "s",
    emoji_order: "1809",
    char: "&diams;"
  },
  {
    name: "clubs",
    unicode: "2663",
    shortname: ":clubs:",
    code: "&clubs;",
    category: "s",
    emoji_order: "1810",
    char: "&clubs;"
  },
  {
    name: "black_joker",
    unicode: "1f0cf",
    shortname: ":black_joker:",
    code: "&#127183;",
    category: "s",
    emoji_order: "1811",
    char: "🃏"
  },
  {
    name: "mahjong",
    unicode: "1f004",
    shortname: ":mahjong:",
    code: "&#126980;",
    category: "s",
    emoji_order: "1812",
    char: "🀄"
  },
  {
    name: "flower_playing_cards",
    unicode: "1f3b4",
    shortname: ":flower_playing_cards:",
    code: "&#127924;",
    category: "s",
    emoji_order: "1813",
    char: "🎴"
  },
  {
    name: "mute",
    unicode: "1f507",
    shortname: ":mute:",
    code: "&#128263;",
    category: "s",
    emoji_order: "1814",
    char: "🔇"
  },
  {
    name: "speaker",
    unicode: "1f508",
    shortname: ":speaker:",
    code: "&#128264;",
    category: "s",
    emoji_order: "1815",
    char: "🔈"
  },
  {
    name: "sound",
    unicode: "1f509",
    shortname: ":sound:",
    code: "&#128265;",
    category: "s",
    emoji_order: "1816",
    char: "🔉"
  },
  {
    name: "loud_sound",
    unicode: "1f50a",
    shortname: ":loud_sound:",
    code: "&#128266;",
    category: "s",
    emoji_order: "1817",
    char: "🔊"
  },
  {
    name: "loudspeaker",
    unicode: "1f4e2",
    shortname: ":loudspeaker:",
    code: "&#128226;",
    category: "s",
    emoji_order: "1818",
    char: "📢"
  },
  {
    name: "mega",
    unicode: "1f4e3",
    shortname: ":mega:",
    code: "&#128227;",
    category: "s",
    emoji_order: "1819",
    char: "📣"
  },
  {
    name: "postal_horn",
    unicode: "1f4ef",
    shortname: ":postal_horn:",
    code: "&#128239;",
    category: "o",
    emoji_order: "1820",
    char: "📯"
  },
  {
    name: "bell",
    unicode: "1f514",
    shortname: ":bell:",
    code: "&#128276;",
    category: "s",
    emoji_order: "1821",
    char: "🔔"
  },
  {
    name: "no_bell",
    unicode: "1f515",
    shortname: ":no_bell:",
    code: "&#128277;",
    category: "s",
    emoji_order: "1822",
    char: "🔕"
  },
  {
    name: "musical_score",
    unicode: "1f3bc",
    shortname: ":musical_score:",
    code: "&#127932;",
    category: "a",
    emoji_order: "1823",
    char: "🎼"
  },
  {
    name: "musical_note",
    unicode: "1f3b5",
    shortname: ":musical_note:",
    code: "&#127925;",
    category: "s",
    emoji_order: "1824",
    char: "🎵"
  },
  {
    name: "notes",
    unicode: "1f3b6",
    shortname: ":notes:",
    code: "&#127926;",
    category: "s",
    emoji_order: "1825",
    char: "🎶"
  },
  {
    name: "studio_microphone",
    unicode: "1f399",
    shortname: ":microphone2:",
    code: "&#127897;",
    category: "o",
    emoji_order: "1826",
    char: "🎙"
  },
  {
    name: "level_slider",
    unicode: "1f39a",
    shortname: ":level_slider:",
    code: "&#127898;",
    category: "o",
    emoji_order: "1827",
    char: "🎚"
  },
  {
    name: "control_knobs",
    unicode: "1f39b",
    shortname: ":control_knobs:",
    code: "&#127899;",
    category: "o",
    emoji_order: "1828",
    char: "🎛"
  },
  {
    name: "microphone",
    unicode: "1f3a4",
    shortname: ":microphone:",
    code: "&#127908;",
    category: "a",
    emoji_order: "1829",
    char: "🎤"
  },
  {
    name: "headphones",
    unicode: "1f3a7",
    shortname: ":headphones:",
    code: "&#127911;",
    category: "a",
    emoji_order: "1830",
    char: "🎧"
  },
  {
    name: "radio",
    unicode: "1f4fb",
    shortname: ":radio:",
    code: "&#128251;",
    category: "o",
    emoji_order: "1831",
    char: "📻"
  },
  {
    name: "saxophone",
    unicode: "1f3b7",
    shortname: ":saxophone:",
    code: "&#127927;",
    category: "a",
    emoji_order: "1832",
    char: "🎷"
  },
  {
    name: "guitar",
    unicode: "1f3b8",
    shortname: ":guitar:",
    code: "&#127928;",
    category: "a",
    emoji_order: "1833",
    char: "🎸"
  },
  {
    name: "musical_keyboard",
    unicode: "1f3b9",
    shortname: ":musical_keyboard:",
    code: "&#127929;",
    category: "a",
    emoji_order: "1834",
    char: "🎹"
  },
  {
    name: "trumpet",
    unicode: "1f3ba",
    shortname: ":trumpet:",
    code: "&#127930;",
    category: "a",
    emoji_order: "1835",
    char: "🎺"
  },
  {
    name: "violin",
    unicode: "1f3bb",
    shortname: ":violin:",
    code: "&#127931;",
    category: "a",
    emoji_order: "1836",
    char: "🎻"
  },
  {
    name: "drum",
    unicode: "1f941",
    shortname: ":drum:",
    code: "&#129345;",
    category: "a",
    emoji_order: "1837",
    char: "🥁"
  },
  {
    name: "iphone",
    unicode: "1f4f1",
    shortname: ":iphone:",
    code: "&#128241;",
    category: "o",
    emoji_order: "1838",
    char: "📱"
  },
  {
    name: "calling",
    unicode: "1f4f2",
    shortname: ":calling:",
    code: "&#128242;",
    category: "o",
    emoji_order: "1839",
    char: "📲"
  },
  {
    name: "telephone",
    unicode: "260e",
    shortname: ":telephone:",
    code: "&#9742;",
    category: "o",
    emoji_order: "1840",
    char: "☎"
  },
  {
    name: "telephone_receiver",
    unicode: "1f4de",
    shortname: ":telephone_receiver:",
    code: "&#128222;",
    category: "o",
    emoji_order: "1841",
    char: "📞"
  },
  {
    name: "pager",
    unicode: "1f4df",
    shortname: ":pager:",
    code: "&#128223;",
    category: "o",
    emoji_order: "1842",
    char: "📟"
  },
  {
    name: "fax",
    unicode: "1f4e0",
    shortname: ":fax:",
    code: "&#128224;",
    category: "o",
    emoji_order: "1843",
    char: "📠"
  },
  {
    name: "battery",
    unicode: "1f50b",
    shortname: ":battery:",
    code: "&#128267;",
    category: "o",
    emoji_order: "1844",
    char: "🔋"
  },
  {
    name: "electric_plug",
    unicode: "1f50c",
    shortname: ":electric_plug:",
    code: "&#128268;",
    category: "o",
    emoji_order: "1845",
    char: "🔌"
  },
  {
    name: "computer",
    unicode: "1f4bb",
    shortname: ":computer:",
    code: "&#128187;",
    category: "o",
    emoji_order: "1846",
    char: "💻"
  },
  {
    name: "desktop_computer",
    unicode: "1f5a5",
    shortname: ":desktop:",
    code: "&#128421;",
    category: "o",
    emoji_order: "1847",
    char: "🖥"
  },
  {
    name: "printer",
    unicode: "1f5a8",
    shortname: ":printer:",
    code: "&#128424;",
    category: "o",
    emoji_order: "1848",
    char: "🖨"
  },
  {
    name: "keyboard",
    unicode: "2328",
    shortname: ":keyboard:",
    code: "&#9000;",
    category: "o",
    emoji_order: "1849",
    char: "⌨"
  },
  {
    name: "three_button_mouse",
    unicode: "1f5b1",
    shortname: ":mouse_three_button:",
    code: "&#128433;",
    category: "o",
    emoji_order: "1850",
    char: "🖱"
  },
  {
    name: "trackball",
    unicode: "1f5b2",
    shortname: ":trackball:",
    code: "&#128434;",
    category: "o",
    emoji_order: "1851",
    char: "🖲"
  },
  {
    name: "minidisc",
    unicode: "1f4bd",
    shortname: ":minidisc:",
    code: "&#128189;",
    category: "o",
    emoji_order: "1852",
    char: "💽"
  },
  {
    name: "floppy_disk",
    unicode: "1f4be",
    shortname: ":floppy_disk:",
    code: "&#128190;",
    category: "o",
    emoji_order: "1853",
    char: "💾"
  },
  {
    name: "cd",
    unicode: "1f4bf",
    shortname: ":cd:",
    code: "&#128191;",
    category: "o",
    emoji_order: "1854",
    char: "💿"
  },
  {
    name: "dvd",
    unicode: "1f4c0",
    shortname: ":dvd:",
    code: "&#128192;",
    category: "o",
    emoji_order: "1855",
    char: "📀"
  },
  {
    name: "movie_camera",
    unicode: "1f3a5",
    shortname: ":movie_camera:",
    code: "&#127909;",
    category: "o",
    emoji_order: "1856",
    char: "🎥"
  },
  {
    name: "film_frames",
    unicode: "1f39e",
    shortname: ":film_frames:",
    code: "&#127902;",
    category: "o",
    emoji_order: "1857",
    char: "🎞"
  },
  {
    name: "film_projector",
    unicode: "1f4fd",
    shortname: ":projector:",
    code: "&#128253;",
    category: "o",
    emoji_order: "1858",
    char: "📽"
  },
  {
    name: "clapper",
    unicode: "1f3ac",
    shortname: ":clapper:",
    code: "&#127916;",
    category: "a",
    emoji_order: "1859",
    char: "🎬"
  },
  {
    name: "tv",
    unicode: "1f4fa",
    shortname: ":tv:",
    code: "&#128250;",
    category: "o",
    emoji_order: "1860",
    char: "📺"
  },
  {
    name: "camera",
    unicode: "1f4f7",
    shortname: ":camera:",
    code: "&#128247;",
    category: "o",
    emoji_order: "1861",
    char: "📷"
  },
  {
    name: "camera_with_flash",
    unicode: "1f4f8",
    shortname: ":camera_with_flash:",
    code: "&#128248;",
    category: "o",
    emoji_order: "1862",
    char: "📸"
  },
  {
    name: "video_camera",
    unicode: "1f4f9",
    shortname: ":video_camera:",
    code: "&#128249;",
    category: "o",
    emoji_order: "1863",
    char: "📹"
  },
  {
    name: "vhs",
    unicode: "1f4fc",
    shortname: ":vhs:",
    code: "&#128252;",
    category: "o",
    emoji_order: "1864",
    char: "📼"
  },
  {
    name: "mag",
    unicode: "1f50d",
    shortname: ":mag:",
    code: "&#128269;",
    category: "o",
    emoji_order: "1865",
    char: "🔍"
  },
  {
    name: "mag_right",
    unicode: "1f50e",
    shortname: ":mag_right:",
    code: "&#128270;",
    category: "o",
    emoji_order: "1866",
    char: "🔎"
  },
  {
    name: "microscope",
    unicode: "1f52c",
    shortname: ":microscope:",
    code: "&#128300;",
    category: "o",
    emoji_order: "1867",
    char: "🔬"
  },
  {
    name: "telescope",
    unicode: "1f52d",
    shortname: ":telescope:",
    code: "&#128301;",
    category: "o",
    emoji_order: "1868",
    char: "🔭"
  },
  {
    name: "satellite_antenna",
    unicode: "1f4e1",
    shortname: ":satellite:",
    code: "&#128225;",
    category: "o",
    emoji_order: "1869",
    char: "📡"
  },
  {
    name: "candle",
    unicode: "1f56f",
    shortname: ":candle:",
    code: "&#128367;",
    category: "o",
    emoji_order: "1870",
    char: "🕯"
  },
  {
    name: "bulb",
    unicode: "1f4a1",
    shortname: ":bulb:",
    code: "&#128161;",
    category: "o",
    emoji_order: "1871",
    char: "💡"
  },
  {
    name: "flashlight",
    unicode: "1f526",
    shortname: ":flashlight:",
    code: "&#128294;",
    category: "o",
    emoji_order: "1872",
    char: "🔦"
  },
  {
    name: "izakaya_lantern",
    unicode: "1f3ee",
    shortname: ":izakaya_lantern:",
    code: "&#127982;",
    category: "o",
    emoji_order: "1873",
    char: "🏮"
  },
  {
    name: "notebook_with_decorative_cover",
    unicode: "1f4d4",
    shortname: ":notebook_with_decorative_cover:",
    code: "&#128212;",
    category: "o",
    emoji_order: "1874",
    char: "📔"
  },
  {
    name: "closed_book",
    unicode: "1f4d5",
    shortname: ":closed_book:",
    code: "&#128213;",
    category: "o",
    emoji_order: "1875",
    char: "📕"
  },
  {
    name: "book",
    unicode: "1f4d6",
    shortname: ":book:",
    code: "&#128214;",
    category: "o",
    emoji_order: "1876",
    char: "📖"
  },
  {
    name: "green_book",
    unicode: "1f4d7",
    shortname: ":green_book:",
    code: "&#128215;",
    category: "o",
    emoji_order: "1877",
    char: "📗"
  },
  {
    name: "blue_book",
    unicode: "1f4d8",
    shortname: ":blue_book:",
    code: "&#128216;",
    category: "o",
    emoji_order: "1878",
    char: "📘"
  },
  {
    name: "orange_book",
    unicode: "1f4d9",
    shortname: ":orange_book:",
    code: "&#128217;",
    category: "o",
    emoji_order: "1879",
    char: "📙"
  },
  {
    name: "books",
    unicode: "1f4da",
    shortname: ":books:",
    code: "&#128218;",
    category: "o",
    emoji_order: "1880",
    char: "📚"
  },
  {
    name: "notebook",
    unicode: "1f4d3",
    shortname: ":notebook:",
    code: "&#128211;",
    category: "o",
    emoji_order: "1881",
    char: "📓"
  },
  {
    name: "ledger",
    unicode: "1f4d2",
    shortname: ":ledger:",
    code: "&#128210;",
    category: "o",
    emoji_order: "1882",
    char: "📒"
  },
  {
    name: "page_with_curl",
    unicode: "1f4c3",
    shortname: ":page_with_curl:",
    code: "&#128195;",
    category: "o",
    emoji_order: "1883",
    char: "📃"
  },
  {
    name: "scroll",
    unicode: "1f4dc",
    shortname: ":scroll:",
    code: "&#128220;",
    category: "o",
    emoji_order: "1884",
    char: "📜"
  },
  {
    name: "page_facing_up",
    unicode: "1f4c4",
    shortname: ":page_facing_up:",
    code: "&#128196;",
    category: "o",
    emoji_order: "1885",
    char: "📄"
  },
  {
    name: "newspaper",
    unicode: "1f4f0",
    shortname: ":newspaper:",
    code: "&#128240;",
    category: "o",
    emoji_order: "1886",
    char: "📰"
  },
  {
    name: "rolled_up_newspaper",
    unicode: "1f5de",
    shortname: ":newspaper2:",
    code: "&#128478;",
    category: "o",
    emoji_order: "1887",
    char: "🗞"
  },
  {
    name: "bookmark_tabs",
    unicode: "1f4d1",
    shortname: ":bookmark_tabs:",
    code: "&#128209;",
    category: "o",
    emoji_order: "1888",
    char: "📑"
  },
  {
    name: "bookmark",
    unicode: "1f516",
    shortname: ":bookmark:",
    code: "&#128278;",
    category: "o",
    emoji_order: "1889",
    char: "🔖"
  },
  {
    name: "label",
    unicode: "1f3f7",
    shortname: ":label:",
    code: "&#127991;",
    category: "o",
    emoji_order: "1890",
    char: "🏷"
  },
  {
    name: "moneybag",
    unicode: "1f4b0",
    shortname: ":moneybag:",
    code: "&#128176;",
    category: "o",
    emoji_order: "1891",
    char: "💰"
  },
  {
    name: "yen",
    unicode: "1f4b4",
    shortname: ":yen:",
    code: "&#128180;",
    category: "o",
    emoji_order: "1892",
    char: "💴"
  },
  {
    name: "dollar",
    unicode: "1f4b5",
    shortname: ":dollar:",
    code: "&#128181;",
    category: "o",
    emoji_order: "1893",
    char: "💵"
  },
  {
    name: "euro",
    unicode: "1f4b6",
    shortname: ":euro:",
    code: "&#128182;",
    category: "o",
    emoji_order: "1894",
    char: "💶"
  },
  {
    name: "pound",
    unicode: "1f4b7",
    shortname: ":pound:",
    code: "&#128183;",
    category: "o",
    emoji_order: "1895",
    char: "💷"
  },
  {
    name: "money_with_wings",
    unicode: "1f4b8",
    shortname: ":money_with_wings:",
    code: "&#128184;",
    category: "o",
    emoji_order: "1896",
    char: "💸"
  },
  {
    name: "credit_card",
    unicode: "1f4b3",
    shortname: ":credit_card:",
    code: "&#128179;",
    category: "o",
    emoji_order: "1897",
    char: "💳"
  },
  {
    name: "chart",
    unicode: "1f4b9",
    shortname: ":chart:",
    code: "&#128185;",
    category: "s",
    emoji_order: "1898",
    char: "💹"
  },
  {
    name: "currency_exchange",
    unicode: "1f4b1",
    shortname: ":currency_exchange:",
    code: "&#128177;",
    category: "s",
    emoji_order: "1899",
    char: "💱"
  },
  {
    name: "heavy_dollar_sign",
    unicode: "1f4b2",
    shortname: ":heavy_dollar_sign:",
    code: "&#128178;",
    category: "s",
    emoji_order: "1900",
    char: "💲"
  },
  {
    name: "envelope",
    unicode: "2709",
    shortname: ":envelope:",
    code: "&#9993;",
    category: "o",
    emoji_order: "1901",
    char: "✉"
  },
  {
    name: "e-mail",
    unicode: "1f4e7",
    shortname: ":e-mail:",
    code: "&#128231;",
    category: "o",
    emoji_order: "1902",
    char: "📧"
  },
  {
    name: "incoming_envelope",
    unicode: "1f4e8",
    shortname: ":incoming_envelope:",
    code: "&#128232;",
    category: "o",
    emoji_order: "1903",
    char: "📨"
  },
  {
    name: "envelope_with_arrow",
    unicode: "1f4e9",
    shortname: ":envelope_with_arrow:",
    code: "&#128233;",
    category: "o",
    emoji_order: "1904",
    char: "📩"
  },
  {
    name: "outbox_tray",
    unicode: "1f4e4",
    shortname: ":outbox_tray:",
    code: "&#128228;",
    category: "o",
    emoji_order: "1905",
    char: "📤"
  },
  {
    name: "inbox_tray",
    unicode: "1f4e5",
    shortname: ":inbox_tray:",
    code: "&#128229;",
    category: "o",
    emoji_order: "1906",
    char: "📥"
  },
  {
    name: "package",
    unicode: "1f4e6",
    shortname: ":package:",
    code: "&#128230;",
    category: "o",
    emoji_order: "1907",
    char: "📦"
  },
  {
    name: "mailbox",
    unicode: "1f4eb",
    shortname: ":mailbox:",
    code: "&#128235;",
    category: "o",
    emoji_order: "1908",
    char: "📫"
  },
  {
    name: "mailbox_closed",
    unicode: "1f4ea",
    shortname: ":mailbox_closed:",
    code: "&#128234;",
    category: "o",
    emoji_order: "1909",
    char: "📪"
  },
  {
    name: "mailbox_with_mail",
    unicode: "1f4ec",
    shortname: ":mailbox_with_mail:",
    code: "&#128236;",
    category: "o",
    emoji_order: "1910",
    char: "📬"
  },
  {
    name: "mailbox_with_no_mail",
    unicode: "1f4ed",
    shortname: ":mailbox_with_no_mail:",
    code: "&#128237;",
    category: "o",
    emoji_order: "1911",
    char: "📭"
  },
  {
    name: "postbox",
    unicode: "1f4ee",
    shortname: ":postbox:",
    code: "&#128238;",
    category: "o",
    emoji_order: "1912",
    char: "📮"
  },
  {
    name: "ballot_box_with_ballot",
    unicode: "1f5f3",
    shortname: ":ballot_box:",
    code: "&#128499;",
    category: "o",
    emoji_order: "1913",
    char: "🗳"
  },
  {
    name: "pencil2",
    unicode: "270f",
    shortname: ":pencil2:",
    code: "&#9999;",
    category: "o",
    emoji_order: "1914",
    char: "✏"
  },
  {
    name: "black_nib",
    unicode: "2712",
    shortname: ":black_nib:",
    code: "&#10002;",
    category: "o",
    emoji_order: "1915",
    char: "✒"
  },
  {
    name: "lower_left_fountain_pen",
    unicode: "1f58b",
    shortname: ":pen_fountain:",
    code: "&#128395;",
    category: "o",
    emoji_order: "1916",
    char: "🖋"
  },
  {
    name: "lower_left_ballpoint_pen",
    unicode: "1f58a",
    shortname: ":pen_ballpoint:",
    code: "&#128394;",
    category: "o",
    emoji_order: "1917",
    char: "🖊"
  },
  {
    name: "lower_left_paintbrush",
    unicode: "1f58c",
    shortname: ":paintbrush:",
    code: "&#128396;",
    category: "o",
    emoji_order: "1918",
    char: "🖌"
  },
  {
    name: "lower_left_crayon",
    unicode: "1f58d",
    shortname: ":crayon:",
    code: "&#128397;",
    category: "o",
    emoji_order: "1919",
    char: "🖍"
  },
  {
    name: "memo",
    unicode: "1f4dd",
    shortname: ":pencil:",
    code: "&#128221;",
    category: "o",
    emoji_order: "1920",
    char: "📝"
  },
  {
    name: "briefcase",
    unicode: "1f4bc",
    shortname: ":briefcase:",
    code: "&#128188;",
    category: "p",
    emoji_order: "1921",
    char: "💼"
  },
  {
    name: "file_folder",
    unicode: "1f4c1",
    shortname: ":file_folder:",
    code: "&#128193;",
    category: "o",
    emoji_order: "1922",
    char: "📁"
  },
  {
    name: "open_file_folder",
    unicode: "1f4c2",
    shortname: ":open_file_folder:",
    code: "&#128194;",
    category: "o",
    emoji_order: "1923",
    char: "📂"
  },
  {
    name: "card_index_dividers",
    unicode: "1f5c2",
    shortname: ":dividers:",
    code: "&#128450;",
    category: "o",
    emoji_order: "1924",
    char: "🗂"
  },
  {
    name: "date",
    unicode: "1f4c5",
    shortname: ":date:",
    code: "&#128197;",
    category: "o",
    emoji_order: "1925",
    char: "📅"
  },
  {
    name: "calendar",
    unicode: "1f4c6",
    shortname: ":calendar:",
    code: "&#128198;",
    category: "o",
    emoji_order: "1926",
    char: "📆"
  },
  {
    name: "spiral_note_pad",
    unicode: "1f5d2",
    shortname: ":notepad_spiral:",
    code: "&#128466;",
    category: "o",
    emoji_order: "1927",
    char: "🗒"
  },
  {
    name: "spiral_calendar_pad",
    unicode: "1f5d3",
    shortname: ":calendar_spiral:",
    code: "&#128467;",
    category: "o",
    emoji_order: "1928",
    char: "🗓"
  },
  {
    name: "card_index",
    unicode: "1f4c7",
    shortname: ":card_index:",
    code: "&#128199;",
    category: "o",
    emoji_order: "1929",
    char: "📇"
  },
  {
    name: "chart_with_upwards_trend",
    unicode: "1f4c8",
    shortname: ":chart_with_upwards_trend:",
    code: "&#128200;",
    category: "o",
    emoji_order: "1930",
    char: "📈"
  },
  {
    name: "chart_with_downwards_trend",
    unicode: "1f4c9",
    shortname: ":chart_with_downwards_trend:",
    code: "&#128201;",
    category: "o",
    emoji_order: "1931",
    char: "📉"
  },
  {
    name: "bar_chart",
    unicode: "1f4ca",
    shortname: ":bar_chart:",
    code: "&#128202;",
    category: "o",
    emoji_order: "1932",
    char: "📊"
  },
  {
    name: "clipboard",
    unicode: "1f4cb",
    shortname: ":clipboard:",
    code: "&#128203;",
    category: "o",
    emoji_order: "1933",
    char: "📋"
  },
  {
    name: "pushpin",
    unicode: "1f4cc",
    shortname: ":pushpin:",
    code: "&#128204;",
    category: "o",
    emoji_order: "1934",
    char: "📌"
  },
  {
    name: "round_pushpin",
    unicode: "1f4cd",
    shortname: ":round_pushpin:",
    code: "&#128205;",
    category: "o",
    emoji_order: "1935",
    char: "📍"
  },
  {
    name: "paperclip",
    unicode: "1f4ce",
    shortname: ":paperclip:",
    code: "&#128206;",
    category: "o",
    emoji_order: "1936",
    char: "📎"
  },
  {
    name: "linked_paperclips",
    unicode: "1f587",
    shortname: ":paperclips:",
    code: "&#128391;",
    category: "o",
    emoji_order: "1937",
    char: "🖇"
  },
  {
    name: "straight_ruler",
    unicode: "1f4cf",
    shortname: ":straight_ruler:",
    code: "&#128207;",
    category: "o",
    emoji_order: "1938",
    char: "📏"
  },
  {
    name: "triangular_ruler",
    unicode: "1f4d0",
    shortname: ":triangular_ruler:",
    code: "&#128208;",
    category: "o",
    emoji_order: "1939",
    char: "📐"
  },
  {
    name: "scissors",
    unicode: "2702",
    shortname: ":scissors:",
    code: "&#9986;",
    category: "o",
    emoji_order: "1940",
    char: "✂"
  },
  {
    name: "card_file_box",
    unicode: "1f5c3",
    shortname: ":card_box:",
    code: "&#128451;",
    category: "o",
    emoji_order: "1941",
    char: "🗃"
  },
  {
    name: "file_cabinet",
    unicode: "1f5c4",
    shortname: ":file_cabinet:",
    code: "&#128452;",
    category: "o",
    emoji_order: "1942",
    char: "🗄"
  },
  {
    name: "wastebasket",
    unicode: "1f5d1",
    shortname: ":wastebasket:",
    code: "&#128465;",
    category: "o",
    emoji_order: "1943",
    char: "🗑"
  },
  {
    name: "lock",
    unicode: "1f512",
    shortname: ":lock:",
    code: "&#128274;",
    category: "o",
    emoji_order: "1944",
    char: "🔒"
  },
  {
    name: "unlock",
    unicode: "1f513",
    shortname: ":unlock:",
    code: "&#128275;",
    category: "o",
    emoji_order: "1945",
    char: "🔓"
  },
  {
    name: "lock_with_ink_pen",
    unicode: "1f50f",
    shortname: ":lock_with_ink_pen:",
    code: "&#128271;",
    category: "o",
    emoji_order: "1946",
    char: "🔏"
  },
  {
    name: "closed_lock_with_key",
    unicode: "1f510",
    shortname: ":closed_lock_with_key:",
    code: "&#128272;",
    category: "o",
    emoji_order: "1947",
    char: "🔐"
  },
  {
    name: "key",
    unicode: "1f511",
    shortname: ":key:",
    code: "&#128273;",
    category: "o",
    emoji_order: "1948",
    char: "🔑"
  },
  {
    name: "old_key",
    unicode: "1f5dd",
    shortname: ":key2:",
    code: "&#128477;",
    category: "o",
    emoji_order: "1949",
    char: "🗝"
  },
  {
    name: "hammer",
    unicode: "1f528",
    shortname: ":hammer:",
    code: "&#128296;",
    category: "o",
    emoji_order: "1950",
    char: "🔨"
  },
  {
    name: "pick",
    unicode: "26cf",
    shortname: ":pick:",
    code: "&#9935;",
    category: "o",
    emoji_order: "1951",
    char: "⛏"
  },
  {
    name: "hammer_and_pick",
    unicode: "2692",
    shortname: ":hammer_pick:",
    code: "&#9874;",
    category: "o",
    emoji_order: "1952",
    char: "⚒"
  },
  {
    name: "hammer_and_wrench",
    unicode: "1f6e0",
    shortname: ":tools:",
    code: "&#128736;",
    category: "o",
    emoji_order: "1953",
    char: "🛠"
  },
  {
    name: "dagger_knife",
    unicode: "1f5e1",
    shortname: ":dagger:",
    code: "&#128481;",
    category: "o",
    emoji_order: "1954",
    char: "🗡"
  },
  {
    name: "crossed_swords",
    unicode: "2694",
    shortname: ":crossed_swords:",
    code: "&#9876;",
    category: "o",
    emoji_order: "1955",
    char: "⚔"
  },
  {
    name: "gun",
    unicode: "1f52b",
    shortname: ":gun:",
    code: "&#128299;",
    category: "o",
    emoji_order: "1956",
    char: "🔫"
  },
  {
    name: "bow_and_arrow",
    unicode: "1f3f9",
    shortname: ":bow_and_arrow:",
    code: "&#127993;",
    category: "a",
    emoji_order: "1957",
    char: "🏹"
  },
  {
    name: "shield",
    unicode: "1f6e1",
    shortname: ":shield:",
    code: "&#128737;",
    category: "o",
    emoji_order: "1958",
    char: "🛡"
  },
  {
    name: "wrench",
    unicode: "1f527",
    shortname: ":wrench:",
    code: "&#128295;",
    category: "o",
    emoji_order: "1959",
    char: "🔧"
  },
  {
    name: "nut_and_bolt",
    unicode: "1f529",
    shortname: ":nut_and_bolt:",
    code: "&#128297;",
    category: "o",
    emoji_order: "1960",
    char: "🔩"
  },
  {
    name: "gear",
    unicode: "2699",
    shortname: ":gear:",
    code: "&#9881;",
    category: "o",
    emoji_order: "1961",
    char: "⚙"
  },
  {
    name: "compression",
    unicode: "1f5dc",
    shortname: ":compression:",
    code: "&#128476;",
    category: "o",
    emoji_order: "1962",
    char: "🗜"
  },
  {
    name: "alembic",
    unicode: "2697",
    shortname: ":alembic:",
    code: "&#9879;",
    category: "o",
    emoji_order: "1963",
    char: "⚗"
  },
  {
    name: "scales",
    unicode: "2696",
    shortname: ":scales:",
    code: "&#9878;",
    category: "o",
    emoji_order: "1964",
    char: "⚖"
  },
  {
    name: "link",
    unicode: "1f517",
    shortname: ":link:",
    code: "&#128279;",
    category: "o",
    emoji_order: "1965",
    char: "🔗"
  },
  {
    name: "chains",
    unicode: "26d3",
    shortname: ":chains:",
    code: "&#9939;",
    category: "o",
    emoji_order: "1966",
    char: "⛓"
  },
  {
    name: "syringe",
    unicode: "1f489",
    shortname: ":syringe:",
    code: "&#128137;",
    category: "o",
    emoji_order: "1967",
    char: "💉"
  },
  {
    name: "pill",
    unicode: "1f48a",
    shortname: ":pill:",
    code: "&#128138;",
    category: "o",
    emoji_order: "1968",
    char: "💊"
  },
  {
    name: "smoking",
    unicode: "1f6ac",
    shortname: ":smoking:",
    code: "&#128684;",
    category: "o",
    emoji_order: "1969",
    char: "🚬"
  },
  {
    name: "coffin",
    unicode: "26b0",
    shortname: ":coffin:",
    code: "&#9904;",
    category: "o",
    emoji_order: "1970",
    char: "⚰"
  },
  {
    name: "funeral_urn",
    unicode: "26b1",
    shortname: ":urn:",
    code: "&#9905;",
    category: "o",
    emoji_order: "1971",
    char: "⚱"
  },
  {
    name: "moyai",
    unicode: "1f5ff",
    shortname: ":moyai:",
    code: "&#128511;",
    category: "o",
    emoji_order: "1972",
    char: "🗿"
  },
  {
    name: "oil_drum",
    unicode: "1f6e2",
    shortname: ":oil:",
    code: "&#128738;",
    category: "o",
    emoji_order: "1973",
    char: "🛢"
  },
  {
    name: "crystal_ball",
    unicode: "1f52e",
    shortname: ":crystal_ball:",
    code: "&#128302;",
    category: "o",
    emoji_order: "1974",
    char: "🔮"
  },
  {
    name: "shopping_cart",
    unicode: "1f6d2",
    shortname: ":shopping_cart:",
    code: "&#128722;",
    category: "o",
    emoji_order: "1975",
    char: "🛒"
  },
  {
    name: "atm",
    unicode: "1f3e7",
    shortname: ":atm:",
    code: "&#127975;",
    category: "s",
    emoji_order: "1976",
    char: "🏧"
  },
  {
    name: "put_litter_in_its_place",
    unicode: "1f6ae",
    shortname: ":put_litter_in_its_place:",
    code: "&#128686;",
    category: "s",
    emoji_order: "1977",
    char: "🚮"
  },
  {
    name: "potable_water",
    unicode: "1f6b0",
    shortname: ":potable_water:",
    code: "&#128688;",
    category: "s",
    emoji_order: "1978",
    char: "🚰"
  },
  {
    name: "wheelchair",
    unicode: "267f",
    shortname: ":wheelchair:",
    code: "&#9855;",
    category: "s",
    emoji_order: "1979",
    char: "♿"
  },
  {
    name: "mens",
    unicode: "1f6b9",
    shortname: ":mens:",
    code: "&#128697;",
    category: "s",
    emoji_order: "1980",
    char: "🚹"
  },
  {
    name: "womens",
    unicode: "1f6ba",
    shortname: ":womens:",
    code: "&#128698;",
    category: "s",
    emoji_order: "1981",
    char: "🚺"
  },
  {
    name: "restroom",
    unicode: "1f6bb",
    shortname: ":restroom:",
    code: "&#128699;",
    category: "s",
    emoji_order: "1982",
    char: "🚻"
  },
  {
    name: "baby_symbol",
    unicode: "1f6bc",
    shortname: ":baby_symbol:",
    code: "&#128700;",
    category: "s",
    emoji_order: "1983",
    char: "🚼"
  },
  {
    name: "wc",
    unicode: "1f6be",
    shortname: ":wc:",
    code: "&#128702;",
    category: "s",
    emoji_order: "1984",
    char: "🚾"
  },
  {
    name: "passport_control",
    unicode: "1f6c2",
    shortname: ":passport_control:",
    code: "&#128706;",
    category: "s",
    emoji_order: "1985",
    char: "🛂"
  },
  {
    name: "customs",
    unicode: "1f6c3",
    shortname: ":customs:",
    code: "&#128707;",
    category: "s",
    emoji_order: "1986",
    char: "🛃"
  },
  {
    name: "baggage_claim",
    unicode: "1f6c4",
    shortname: ":baggage_claim:",
    code: "&#128708;",
    category: "s",
    emoji_order: "1987",
    char: "🛄"
  },
  {
    name: "left_luggage",
    unicode: "1f6c5",
    shortname: ":left_luggage:",
    code: "&#128709;",
    category: "s",
    emoji_order: "1988",
    char: "🛅"
  },
  {
    name: "warning",
    unicode: "26a0",
    shortname: ":warning:",
    code: "&#9888;",
    category: "s",
    emoji_order: "1989",
    char: "⚠"
  },
  {
    name: "children_crossing",
    unicode: "1f6b8",
    shortname: ":children_crossing:",
    code: "&#128696;",
    category: "s",
    emoji_order: "1990",
    char: "🚸"
  },
  {
    name: "no_entry",
    unicode: "26d4",
    shortname: ":no_entry:",
    code: "&#9940;",
    category: "s",
    emoji_order: "1991",
    char: "⛔"
  },
  {
    name: "no_entry_sign",
    unicode: "1f6ab",
    shortname: ":no_entry_sign:",
    code: "&#128683;",
    category: "s",
    emoji_order: "1992",
    char: "🚫"
  },
  {
    name: "no_bicycles",
    unicode: "1f6b3",
    shortname: ":no_bicycles:",
    code: "&#128691;",
    category: "s",
    emoji_order: "1993",
    char: "🚳"
  },
  {
    name: "no_smoking",
    unicode: "1f6ad",
    shortname: ":no_smoking:",
    code: "&#128685;",
    category: "s",
    emoji_order: "1994",
    char: "🚭"
  },
  {
    name: "do_not_litter",
    unicode: "1f6af",
    shortname: ":do_not_litter:",
    code: "&#128687;",
    category: "s",
    emoji_order: "1995",
    char: "🚯"
  },
  {
    name: "non-potable_water",
    unicode: "1f6b1",
    shortname: ":non-potable_water:",
    code: "&#128689;",
    category: "s",
    emoji_order: "1996",
    char: "🚱"
  },
  {
    name: "no_pedestrians",
    unicode: "1f6b7",
    shortname: ":no_pedestrians:",
    code: "&#128695;",
    category: "s",
    emoji_order: "1997",
    char: "🚷"
  },
  {
    name: "no_mobile_phones",
    unicode: "1f4f5",
    shortname: ":no_mobile_phones:",
    code: "&#128245;",
    category: "s",
    emoji_order: "1998",
    char: "📵"
  },
  {
    name: "underage",
    unicode: "1f51e",
    shortname: ":underage:",
    code: "&#128286;",
    category: "s",
    emoji_order: "1999",
    char: "🔞"
  },
  {
    name: "radioactive",
    unicode: "2622",
    shortname: ":radioactive:",
    code: "&#9762;",
    category: "s",
    emoji_order: "2000",
    char: "☢"
  },
  {
    name: "biohazard",
    unicode: "2623",
    shortname: ":biohazard:",
    code: "&#9763;",
    category: "s",
    emoji_order: "2001",
    char: "☣"
  },
  {
    name: "arrow_up",
    unicode: "2b06",
    shortname: ":arrow_up:",
    code: "&#11014;",
    category: "s",
    emoji_order: "2002",
    char: "⬆"
  },
  {
    name: "arrow_upper_right",
    unicode: "2197",
    shortname: ":arrow_upper_right:",
    code: "&#8599;",
    category: "s",
    emoji_order: "2003",
    char: "↗"
  },
  {
    name: "arrow_right",
    unicode: "27a1",
    shortname: ":arrow_right:",
    code: "&#10145;",
    category: "s",
    emoji_order: "2004",
    char: "➡"
  },
  {
    name: "arrow_lower_right",
    unicode: "2198",
    shortname: ":arrow_lower_right:",
    code: "&#8600;",
    category: "s",
    emoji_order: "2005",
    char: "↘"
  },
  {
    name: "arrow_down",
    unicode: "2b07",
    shortname: ":arrow_down:",
    code: "&#11015;",
    category: "s",
    emoji_order: "2006",
    char: "⬇"
  },
  {
    name: "arrow_lower_left",
    unicode: "2199",
    shortname: ":arrow_lower_left:",
    code: "&#8601;",
    category: "s",
    emoji_order: "2007",
    char: "↙"
  },
  {
    name: "arrow_left",
    unicode: "2b05",
    shortname: ":arrow_left:",
    code: "&#11013;",
    category: "s",
    emoji_order: "2008",
    char: "⬅"
  },
  {
    name: "arrow_upper_left",
    unicode: "2196",
    shortname: ":arrow_upper_left:",
    code: "&#8598;",
    category: "s",
    emoji_order: "2009",
    char: "↖"
  },
  {
    name: "arrow_up_down",
    unicode: "2195",
    shortname: ":arrow_up_down:",
    code: "&#8597;",
    category: "s",
    emoji_order: "2010",
    char: "↕"
  },
  {
    name: "left_right_arrow",
    unicode: "2194",
    shortname: ":left_right_arrow:",
    code: "&harr;",
    category: "s",
    emoji_order: "2011",
    char: "&harr;"
  },
  {
    name: "leftwards_arrow_with_hook",
    unicode: "21a9",
    shortname: ":leftwards_arrow_with_hook:",
    code: "&#8617;",
    category: "s",
    emoji_order: "2012",
    char: "↩"
  },
  {
    name: "arrow_right_hook",
    unicode: "21aa",
    shortname: ":arrow_right_hook:",
    code: "&#8618;",
    category: "s",
    emoji_order: "2013",
    char: "↪"
  },
  {
    name: "arrow_heading_up",
    unicode: "2934",
    shortname: ":arrow_heading_up:",
    code: "&#10548;",
    category: "s",
    emoji_order: "2014",
    char: "⤴"
  },
  {
    name: "arrow_heading_down",
    unicode: "2935",
    shortname: ":arrow_heading_down:",
    code: "&#10549;",
    category: "s",
    emoji_order: "2015",
    char: "⤵"
  },
  {
    name: "arrows_clockwise",
    unicode: "1f503",
    shortname: ":arrows_clockwise:",
    code: "&#128259;",
    category: "s",
    emoji_order: "2016",
    char: "🔃"
  },
  {
    name: "arrows_counterclockwise",
    unicode: "1f504",
    shortname: ":arrows_counterclockwise:",
    code: "&#128260;",
    category: "s",
    emoji_order: "2017",
    char: "🔄"
  },
  {
    name: "back",
    unicode: "1f519",
    shortname: ":back:",
    code: "&#128281;",
    category: "s",
    emoji_order: "2018",
    char: "🔙"
  },
  {
    name: "end",
    unicode: "1f51a",
    shortname: ":end:",
    code: "&#128282;",
    category: "s",
    emoji_order: "2019",
    char: "🔚"
  },
  {
    name: "on",
    unicode: "1f51b",
    shortname: ":on:",
    code: "&#128283;",
    category: "s",
    emoji_order: "2020",
    char: "🔛"
  },
  {
    name: "soon",
    unicode: "1f51c",
    shortname: ":soon:",
    code: "&#128284;",
    category: "s",
    emoji_order: "2021",
    char: "🔜"
  },
  {
    name: "top",
    unicode: "1f51d",
    shortname: ":top:",
    code: "&#128285;",
    category: "s",
    emoji_order: "2022",
    char: "🔝"
  },
  {
    name: "place_of_worship",
    unicode: "1f6d0",
    shortname: ":place_of_worship:",
    code: "&#128720;",
    category: "s",
    emoji_order: "2023",
    char: "🛐"
  },
  {
    name: "atom_symbol",
    unicode: "269b",
    shortname: ":atom:",
    code: "&#9883;",
    category: "s",
    emoji_order: "2024",
    char: "⚛"
  },
  {
    name: "om_symbol",
    unicode: "1f549",
    shortname: ":om_symbol:",
    code: "&#128329;",
    category: "s",
    emoji_order: "2025",
    char: "🕉"
  },
  {
    name: "star_of_david",
    unicode: "2721",
    shortname: ":star_of_david:",
    code: "&#10017;",
    category: "s",
    emoji_order: "2026",
    char: "✡"
  },
  {
    name: "wheel_of_dharma",
    unicode: "2638",
    shortname: ":wheel_of_dharma:",
    code: "&#9784;",
    category: "s",
    emoji_order: "2027",
    char: "☸"
  },
  {
    name: "yin_yang",
    unicode: "262f",
    shortname: ":yin_yang:",
    code: "&#9775;",
    category: "s",
    emoji_order: "2028",
    char: "☯"
  },
  {
    name: "latin_cross",
    unicode: "271d",
    shortname: ":cross:",
    code: "&#10013;",
    category: "s",
    emoji_order: "2029",
    char: "✝"
  },
  {
    name: "orthodox_cross",
    unicode: "2626",
    shortname: ":orthodox_cross:",
    code: "&#9766;",
    category: "s",
    emoji_order: "2030",
    char: "☦"
  },
  {
    name: "star_and_crescent",
    unicode: "262a",
    shortname: ":star_and_crescent:",
    code: "&#9770;",
    category: "s",
    emoji_order: "2031",
    char: "☪"
  },
  {
    name: "peace_symbol",
    unicode: "262e",
    shortname: ":peace:",
    code: "&#9774;",
    category: "s",
    emoji_order: "2032",
    char: "☮"
  },
  {
    name: "menorah_with_nine_branches",
    unicode: "1f54e",
    shortname: ":menorah:",
    code: "&#128334;",
    category: "s",
    emoji_order: "2033",
    char: "🕎"
  },
  {
    name: "six_pointed_star",
    unicode: "1f52f",
    shortname: ":six_pointed_star:",
    code: "&#128303;",
    category: "s",
    emoji_order: "2034",
    char: "🔯"
  },
  {
    name: "aries",
    unicode: "2648",
    shortname: ":aries:",
    code: "&#9800;",
    category: "s",
    emoji_order: "2035",
    char: "♈"
  },
  {
    name: "taurus",
    unicode: "2649",
    shortname: ":taurus:",
    code: "&#9801;",
    category: "s",
    emoji_order: "2036",
    char: "♉"
  },
  {
    name: "gemini",
    unicode: "264a",
    shortname: ":gemini:",
    code: "&#9802;",
    category: "s",
    emoji_order: "2037",
    char: "♊"
  },
  {
    name: "cancer",
    unicode: "264b",
    shortname: ":cancer:",
    code: "&#9803;",
    category: "s",
    emoji_order: "2038",
    char: "♋"
  },
  { name: "leo", unicode: "264c", shortname: ":leo:", code: "&#9804;", category: "s", emoji_order: "2039", char: "♌" },
  {
    name: "virgo",
    unicode: "264d",
    shortname: ":virgo:",
    code: "&#9805;",
    category: "s",
    emoji_order: "2040",
    char: "♍"
  },
  {
    name: "libra",
    unicode: "264e",
    shortname: ":libra:",
    code: "&#9806;",
    category: "s",
    emoji_order: "2041",
    char: "♎"
  },
  {
    name: "scorpius",
    unicode: "264f",
    shortname: ":scorpius:",
    code: "&#9807;",
    category: "s",
    emoji_order: "2042",
    char: "♏"
  },
  {
    name: "sagittarius",
    unicode: "2650",
    shortname: ":sagittarius:",
    code: "&#9808;",
    category: "s",
    emoji_order: "2043",
    char: "♐"
  },
  {
    name: "capricorn",
    unicode: "2651",
    shortname: ":capricorn:",
    code: "&#9809;",
    category: "s",
    emoji_order: "2044",
    char: "♑"
  },
  {
    name: "aquarius",
    unicode: "2652",
    shortname: ":aquarius:",
    code: "&#9810;",
    category: "s",
    emoji_order: "2045",
    char: "♒"
  },
  {
    name: "pisces",
    unicode: "2653",
    shortname: ":pisces:",
    code: "&#9811;",
    category: "s",
    emoji_order: "2046",
    char: "♓"
  },
  {
    name: "ophiuchus",
    unicode: "26ce",
    shortname: ":ophiuchus:",
    code: "&#9934;",
    category: "s",
    emoji_order: "2047",
    char: "⛎"
  },
  {
    name: "twisted_rightwards_arrows",
    unicode: "1f500",
    shortname: ":twisted_rightwards_arrows:",
    code: "&#128256;",
    category: "s",
    emoji_order: "2048",
    char: "🔀"
  },
  {
    name: "repeat",
    unicode: "1f501",
    shortname: ":repeat:",
    code: "&#128257;",
    category: "s",
    emoji_order: "2049",
    char: "🔁"
  },
  {
    name: "repeat_one",
    unicode: "1f502",
    shortname: ":repeat_one:",
    code: "&#128258;",
    category: "s",
    emoji_order: "2050",
    char: "🔂"
  },
  {
    name: "arrow_forward",
    unicode: "25b6",
    shortname: ":arrow_forward:",
    code: "&#9654;",
    category: "s",
    emoji_order: "2051",
    char: "▶"
  },
  {
    name: "fast_forward",
    unicode: "23e9",
    shortname: ":fast_forward:",
    code: "&#9193;",
    category: "s",
    emoji_order: "2052",
    char: "⏩"
  },
  {
    name: "black_right_pointing_double_triangle_with_vertical_bar",
    unicode: "23ed",
    shortname: ":track_next:",
    code: "&#9197;",
    category: "s",
    emoji_order: "2053",
    char: "⏭"
  },
  {
    name: "black_right_pointing_triangle_with_double_vertical_bar",
    unicode: "23ef",
    shortname: ":play_pause:",
    code: "&#9199;",
    category: "s",
    emoji_order: "2054",
    char: "⏯"
  },
  {
    name: "arrow_backward",
    unicode: "25c0",
    shortname: ":arrow_backward:",
    code: "&#9664;",
    category: "s",
    emoji_order: "2055",
    char: "◀"
  },
  {
    name: "rewind",
    unicode: "23ea",
    shortname: ":rewind:",
    code: "&#9194;",
    category: "s",
    emoji_order: "2056",
    char: "⏪"
  },
  {
    name: "black_left_pointing_double_triangle_with_vertical_bar",
    unicode: "23ee",
    shortname: ":track_previous:",
    code: "&#9198;",
    category: "s",
    emoji_order: "2057",
    char: "⏮"
  },
  {
    name: "arrow_up_small",
    unicode: "1f53c",
    shortname: ":arrow_up_small:",
    code: "&#128316;",
    category: "s",
    emoji_order: "2058",
    char: "🔼"
  },
  {
    name: "arrow_double_up",
    unicode: "23eb",
    shortname: ":arrow_double_up:",
    code: "&#9195;",
    category: "s",
    emoji_order: "2059",
    char: "⏫"
  },
  {
    name: "arrow_down_small",
    unicode: "1f53d",
    shortname: ":arrow_down_small:",
    code: "&#128317;",
    category: "s",
    emoji_order: "2060",
    char: "🔽"
  },
  {
    name: "arrow_double_down",
    unicode: "23ec",
    shortname: ":arrow_double_down:",
    code: "&#9196;",
    category: "s",
    emoji_order: "2061",
    char: "⏬"
  },
  {
    name: "double_vertical_bar",
    unicode: "23f8",
    shortname: ":pause_button:",
    code: "&#9208;",
    category: "s",
    emoji_order: "2062",
    char: "⏸"
  },
  {
    name: "black_square_for_stop",
    unicode: "23f9",
    shortname: ":stop_button:",
    code: "&#9209;",
    category: "s",
    emoji_order: "2063",
    char: "⏹"
  },
  {
    name: "black_circle_for_record",
    unicode: "23fa",
    shortname: ":record_button:",
    code: "&#9210;",
    category: "s",
    emoji_order: "2064",
    char: "⏺"
  },
  {
    name: "eject",
    unicode: "23cf",
    shortname: ":eject:",
    code: "&#9167;",
    category: "s",
    emoji_order: "2065",
    char: "⏏"
  },
  {
    name: "cinema",
    unicode: "1f3a6",
    shortname: ":cinema:",
    code: "&#127910;",
    category: "s",
    emoji_order: "2066",
    char: "🎦"
  },
  {
    name: "low_brightness",
    unicode: "1f505",
    shortname: ":low_brightness:",
    code: "&#128261;",
    category: "s",
    emoji_order: "2067",
    char: "🔅"
  },
  {
    name: "high_brightness",
    unicode: "1f506",
    shortname: ":high_brightness:",
    code: "&#128262;",
    category: "s",
    emoji_order: "2068",
    char: "🔆"
  },
  {
    name: "signal_strength",
    unicode: "1f4f6",
    shortname: ":signal_strength:",
    code: "&#128246;",
    category: "s",
    emoji_order: "2069",
    char: "📶"
  },
  {
    name: "vibration_mode",
    unicode: "1f4f3",
    shortname: ":vibration_mode:",
    code: "&#128243;",
    category: "s",
    emoji_order: "2070",
    char: "📳"
  },
  {
    name: "mobile_phone_off",
    unicode: "1f4f4",
    shortname: ":mobile_phone_off:",
    code: "&#128244;",
    category: "s",
    emoji_order: "2071",
    char: "📴"
  },
  {
    name: "recycle",
    unicode: "267b",
    shortname: ":recycle:",
    code: "&#9851;",
    category: "s",
    emoji_order: "2072",
    char: "♻"
  },
  {
    name: "name_badge",
    unicode: "1f4db",
    shortname: ":name_badge:",
    code: "&#128219;",
    category: "s",
    emoji_order: "2073",
    char: "📛"
  },
  {
    name: "fleur_de_lis",
    unicode: "269c",
    shortname: ":fleur-de-lis:",
    code: "&#9884;",
    category: "s",
    emoji_order: "2074",
    char: "⚜"
  },
  {
    name: "beginner",
    unicode: "1f530",
    shortname: ":beginner:",
    code: "&#128304;",
    category: "s",
    emoji_order: "2075",
    char: "🔰"
  },
  {
    name: "trident",
    unicode: "1f531",
    shortname: ":trident:",
    code: "&#128305;",
    category: "s",
    emoji_order: "2076",
    char: "🔱"
  },
  { name: "o", unicode: "2b55", shortname: ":o:", code: "&#11093;", category: "s", emoji_order: "2077", char: "⭕" },
  {
    name: "white_check_mark",
    unicode: "2705",
    shortname: ":white_check_mark:",
    code: "&#9989;",
    category: "s",
    emoji_order: "2078",
    char: "✅"
  },
  {
    name: "ballot_box_with_check",
    unicode: "2611",
    shortname: ":ballot_box_with_check:",
    code: "&#9745;",
    category: "s",
    emoji_order: "2079",
    char: "☑"
  },
  {
    name: "heavy_check_mark",
    unicode: "2714",
    shortname: ":heavy_check_mark:",
    code: "&#10004;",
    category: "s",
    emoji_order: "2080",
    char: "✔"
  },
  {
    name: "heavy_multiplication_x",
    unicode: "2716",
    shortname: ":heavy_multiplication_x:",
    code: "&#10006;",
    category: "s",
    emoji_order: "2081",
    char: "✖"
  },
  { name: "x", unicode: "274c", shortname: ":x:", code: "&#10060;", category: "s", emoji_order: "2082", char: "❌" },
  {
    name: "negative_squared_cross_mark",
    unicode: "274e",
    shortname: ":negative_squared_cross_mark:",
    code: "&#10062;",
    category: "s",
    emoji_order: "2083",
    char: "❎"
  },
  {
    name: "heavy_plus_sign",
    unicode: "2795",
    shortname: ":heavy_plus_sign:",
    code: "&#10133;",
    category: "s",
    emoji_order: "2084",
    char: "➕"
  },
  {
    name: "heavy_minus_sign",
    unicode: "2796",
    shortname: ":heavy_minus_sign:",
    code: "&#10134;",
    category: "s",
    emoji_order: "2088",
    char: "➖"
  },
  {
    name: "heavy_division_sign",
    unicode: "2797",
    shortname: ":heavy_division_sign:",
    code: "&#10135;",
    category: "s",
    emoji_order: "2089",
    char: "➗"
  },
  {
    name: "curly_loop",
    unicode: "27b0",
    shortname: ":curly_loop:",
    code: "&#10160;",
    category: "s",
    emoji_order: "2090",
    char: "➰"
  },
  {
    name: "loop",
    unicode: "27bf",
    shortname: ":loop:",
    code: "&#10175;",
    category: "s",
    emoji_order: "2091",
    char: "➿"
  },
  {
    name: "part_alternation_mark",
    unicode: "303d",
    shortname: ":part_alternation_mark:",
    code: "&#12349;",
    category: "s",
    emoji_order: "2092",
    char: "〽"
  },
  {
    name: "eight_spoked_asterisk",
    unicode: "2733",
    shortname: ":eight_spoked_asterisk:",
    code: "&#10035;",
    category: "s",
    emoji_order: "2093",
    char: "✳"
  },
  {
    name: "eight_pointed_black_star",
    unicode: "2734",
    shortname: ":eight_pointed_black_star:",
    code: "&#10036;",
    category: "s",
    emoji_order: "2094",
    char: "✴"
  },
  {
    name: "sparkle",
    unicode: "2747",
    shortname: ":sparkle:",
    code: "&#10055;",
    category: "s",
    emoji_order: "2095",
    char: "❇"
  },
  {
    name: "bangbang",
    unicode: "203c",
    shortname: ":bangbang:",
    code: "&#8252;",
    category: "s",
    emoji_order: "2096",
    char: "‼"
  },
  {
    name: "interrobang",
    unicode: "2049",
    shortname: ":interrobang:",
    code: "&#8265;",
    category: "s",
    emoji_order: "2097",
    char: "⁉"
  },
  {
    name: "question",
    unicode: "2753",
    shortname: ":question:",
    code: "&#10067;",
    category: "s",
    emoji_order: "2098",
    char: "❓"
  },
  {
    name: "grey_question",
    unicode: "2754",
    shortname: ":grey_question:",
    code: "&#10068;",
    category: "s",
    emoji_order: "2099",
    char: "❔"
  },
  {
    name: "grey_exclamation",
    unicode: "2755",
    shortname: ":grey_exclamation:",
    code: "&#10069;",
    category: "s",
    emoji_order: "2100",
    char: "❕"
  },
  {
    name: "exclamation",
    unicode: "2757",
    shortname: ":exclamation:",
    code: "&#10071;",
    category: "s",
    emoji_order: "2101",
    char: "❗"
  },
  {
    name: "wavy_dash",
    unicode: "3030",
    shortname: ":wavy_dash:",
    code: "&#12336;",
    category: "s",
    emoji_order: "2102",
    char: "〰"
  },
  {
    name: "copyright",
    unicode: "00a9",
    shortname: ":copyright:",
    code: "&copy;",
    category: "s",
    emoji_order: "2103",
    char: "&copy;"
  },
  {
    name: "registered",
    unicode: "00ae",
    shortname: ":registered:",
    code: "&reg;",
    category: "s",
    emoji_order: "2104",
    char: "&reg;"
  },
  {
    name: "tm",
    unicode: "2122",
    shortname: ":tm:",
    code: "&trade;",
    category: "s",
    emoji_order: "2105",
    char: "&trade;"
  },
  {
    name: "hash",
    unicode: "0023-fe0f-20e3",
    shortname: ":hash:",
    code: "#&#8419;",
    category: "s",
    emoji_order: "2106",
    char: "#⃣"
  },
  {
    name: "keycap_star",
    unicode: "002a-fe0f-20e3",
    shortname: ":asterisk:",
    code: "*&#8419;",
    category: "s",
    emoji_order: "2107",
    char: "*⃣"
  },
  {
    name: "zero",
    unicode: "0030-fe0f-20e3",
    shortname: ":zero:",
    code: "0&#8419;",
    category: "s",
    emoji_order: "2108",
    char: "0⃣"
  },
  {
    name: "one",
    unicode: "0031-fe0f-20e3",
    shortname: ":one:",
    code: "1&#8419;",
    category: "s",
    emoji_order: "2109",
    char: "1⃣"
  },
  {
    name: "two",
    unicode: "0032-fe0f-20e3",
    shortname: ":two:",
    code: "2&#8419;",
    category: "s",
    emoji_order: "2110",
    char: "2⃣"
  },
  {
    name: "three",
    unicode: "0033-fe0f-20e3",
    shortname: ":three:",
    code: "3&#8419;",
    category: "s",
    emoji_order: "2111",
    char: "3⃣"
  },
  {
    name: "four",
    unicode: "0034-fe0f-20e3",
    shortname: ":four:",
    code: "4&#8419;",
    category: "s",
    emoji_order: "2112",
    char: "4⃣"
  },
  {
    name: "five",
    unicode: "0035-fe0f-20e3",
    shortname: ":five:",
    code: "5&#8419;",
    category: "s",
    emoji_order: "2113",
    char: "5⃣"
  },
  {
    name: "six",
    unicode: "0036-fe0f-20e3",
    shortname: ":six:",
    code: "6&#8419;",
    category: "s",
    emoji_order: "2114",
    char: "6⃣"
  },
  {
    name: "seven",
    unicode: "0037-fe0f-20e3",
    shortname: ":seven:",
    code: "7&#8419;",
    category: "s",
    emoji_order: "2115",
    char: "7⃣"
  },
  {
    name: "eight",
    unicode: "0038-fe0f-20e3",
    shortname: ":eight:",
    code: "8&#8419;",
    category: "s",
    emoji_order: "2116",
    char: "8⃣"
  },
  {
    name: "nine",
    unicode: "0039-fe0f-20e3",
    shortname: ":nine:",
    code: "9&#8419;",
    category: "s",
    emoji_order: "2117",
    char: "9⃣"
  },
  {
    name: "keycap_ten",
    unicode: "1f51f",
    shortname: ":keycap_ten:",
    code: "&#128287;",
    category: "s",
    emoji_order: "2118",
    char: "🔟"
  },
  {
    name: "capital_abcd",
    unicode: "1f520",
    shortname: ":capital_abcd:",
    code: "&#128288;",
    category: "s",
    emoji_order: "2120",
    char: "🔠"
  },
  {
    name: "abcd",
    unicode: "1f521",
    shortname: ":abcd:",
    code: "&#128289;",
    category: "s",
    emoji_order: "2121",
    char: "🔡"
  },
  { name: "s", unicode: "1f523", shortname: ":s:", code: "&#128291;", category: "s", emoji_order: "2123", char: "🔣" },
  {
    name: "abc",
    unicode: "1f524",
    shortname: ":abc:",
    code: "&#128292;",
    category: "s",
    emoji_order: "2124",
    char: "🔤"
  },
  { name: "a", unicode: "1f170", shortname: ":a:", code: "&#127344;", category: "s", emoji_order: "2125", char: "🅰" },
  {
    name: "ab",
    unicode: "1f18e",
    shortname: ":ab:",
    code: "&#127374;",
    category: "s",
    emoji_order: "2126",
    char: "🆎"
  },
  { name: "b", unicode: "1f171", shortname: ":b:", code: "&#127345;", category: "s", emoji_order: "2127", char: "🅱" },
  {
    name: "cl",
    unicode: "1f191",
    shortname: ":cl:",
    code: "&#127377;",
    category: "s",
    emoji_order: "2128",
    char: "🆑"
  },
  {
    name: "cool",
    unicode: "1f192",
    shortname: ":cool:",
    code: "&#127378;",
    category: "s",
    emoji_order: "2129",
    char: "🆒"
  },
  {
    name: "free",
    unicode: "1f193",
    shortname: ":free:",
    code: "&#127379;",
    category: "s",
    emoji_order: "2130",
    char: "🆓"
  },
  {
    name: "information_source",
    unicode: "2139",
    shortname: ":information_source:",
    code: "&#8505;",
    category: "s",
    emoji_order: "2131",
    char: "ℹ"
  },
  {
    name: "id",
    unicode: "1f194",
    shortname: ":id:",
    code: "&#127380;",
    category: "s",
    emoji_order: "2132",
    char: "🆔"
  },
  { name: "m", unicode: "24c2", shortname: ":m:", code: "&#9410;", category: "s", emoji_order: "2133", char: "Ⓜ" },
  {
    name: "new",
    unicode: "1f195",
    shortname: ":new:",
    code: "&#127381;",
    category: "s",
    emoji_order: "2134",
    char: "🆕"
  },
  {
    name: "ng",
    unicode: "1f196",
    shortname: ":ng:",
    code: "&#127382;",
    category: "s",
    emoji_order: "2135",
    char: "🆖"
  },
  { name: "o2", unicode: "1f17e", shortname: ":o2:", code: "&#127358;", category: "s", emoji_order: "2136", char: "🅾" },
  {
    name: "ok",
    unicode: "1f197",
    shortname: ":ok:",
    code: "&#127383;",
    category: "s",
    emoji_order: "2137",
    char: "🆗"
  },
  {
    name: "parking",
    unicode: "1f17f",
    shortname: ":parking:",
    code: "&#127359;",
    category: "s",
    emoji_order: "2138",
    char: "🅿"
  },
  {
    name: "sos",
    unicode: "1f198",
    shortname: ":sos:",
    code: "&#127384;",
    category: "s",
    emoji_order: "2139",
    char: "🆘"
  },
  {
    name: "up",
    unicode: "1f199",
    shortname: ":up:",
    code: "&#127385;",
    category: "s",
    emoji_order: "2140",
    char: "🆙"
  },
  {
    name: "vs",
    unicode: "1f19a",
    shortname: ":vs:",
    code: "&#127386;",
    category: "s",
    emoji_order: "2141",
    char: "🆚"
  },
  {
    name: "koko",
    unicode: "1f201",
    shortname: ":koko:",
    code: "&#127489;",
    category: "s",
    emoji_order: "2142",
    char: "🈁"
  },
  {
    name: "sa",
    unicode: "1f202",
    shortname: ":sa:",
    code: "&#127490;",
    category: "s",
    emoji_order: "2143",
    char: "🈂"
  },
  {
    name: "u6708",
    unicode: "1f237",
    shortname: ":u6708:",
    code: "&#127543;",
    category: "s",
    emoji_order: "2144",
    char: "🈷"
  },
  {
    name: "u6709",
    unicode: "1f236",
    shortname: ":u6709:",
    code: "&#127542;",
    category: "s",
    emoji_order: "2145",
    char: "🈶"
  },
  {
    name: "u6307",
    unicode: "1f22f",
    shortname: ":u6307:",
    code: "&#127535;",
    category: "s",
    emoji_order: "2146",
    char: "🈯"
  },
  {
    name: "ideograph_advantage",
    unicode: "1f250",
    shortname: ":ideograph_advantage:",
    code: "&#127568;",
    category: "s",
    emoji_order: "2147",
    char: "🉐"
  },
  {
    name: "u5272",
    unicode: "1f239",
    shortname: ":u5272:",
    code: "&#127545;",
    category: "s",
    emoji_order: "2148",
    char: "🈹"
  },
  {
    name: "u7121",
    unicode: "1f21a",
    shortname: ":u7121:",
    code: "&#127514;",
    category: "s",
    emoji_order: "2149",
    char: "🈚"
  },
  {
    name: "u7981",
    unicode: "1f232",
    shortname: ":u7981:",
    code: "&#127538;",
    category: "s",
    emoji_order: "2150",
    char: "🈲"
  },
  {
    name: "accept",
    unicode: "1f251",
    shortname: ":accept:",
    code: "&#127569;",
    category: "s",
    emoji_order: "2151",
    char: "🉑"
  },
  {
    name: "u7533",
    unicode: "1f238",
    shortname: ":u7533:",
    code: "&#127544;",
    category: "s",
    emoji_order: "2152",
    char: "🈸"
  },
  {
    name: "u5408",
    unicode: "1f234",
    shortname: ":u5408:",
    code: "&#127540;",
    category: "s",
    emoji_order: "2153",
    char: "🈴"
  },
  {
    name: "u7a7a",
    unicode: "1f233",
    shortname: ":u7a7a:",
    code: "&#127539;",
    category: "s",
    emoji_order: "2154",
    char: "🈳"
  },
  {
    name: "congratulations",
    unicode: "3297",
    shortname: ":congratulations:",
    code: "&#12951;",
    category: "s",
    emoji_order: "2155",
    char: "㊗"
  },
  {
    name: "secret",
    unicode: "3299",
    shortname: ":secret:",
    code: "&#12953;",
    category: "s",
    emoji_order: "2156",
    char: "㊙"
  },
  {
    name: "u55b6",
    unicode: "1f23a",
    shortname: ":u55b6:",
    code: "&#127546;",
    category: "s",
    emoji_order: "2157",
    char: "🈺"
  },
  {
    name: "u6e80",
    unicode: "1f235",
    shortname: ":u6e80:",
    code: "&#127541;",
    category: "s",
    emoji_order: "2158",
    char: "🈵"
  },
  {
    name: "black_small_square",
    unicode: "25aa",
    shortname: ":black_small_square:",
    code: "&#9642;",
    category: "s",
    emoji_order: "2159",
    char: "▪"
  },
  {
    name: "white_small_square",
    unicode: "25ab",
    shortname: ":white_small_square:",
    code: "&#9643;",
    category: "s",
    emoji_order: "2160",
    char: "▫"
  },
  {
    name: "white_medium_square",
    unicode: "25fb",
    shortname: ":white_medium_square:",
    code: "&#9723;",
    category: "s",
    emoji_order: "2161",
    char: "◻"
  },
  {
    name: "black_medium_square",
    unicode: "25fc",
    shortname: ":black_medium_square:",
    code: "&#9724;",
    category: "s",
    emoji_order: "2162",
    char: "◼"
  },
  {
    name: "white_medium_small_square",
    unicode: "25fd",
    shortname: ":white_medium_small_square:",
    code: "&#9725;",
    category: "s",
    emoji_order: "2163",
    char: "◽"
  },
  {
    name: "black_medium_small_square",
    unicode: "25fe",
    shortname: ":black_medium_small_square:",
    code: "&#9726;",
    category: "s",
    emoji_order: "2164",
    char: "◾"
  },
  {
    name: "black_large_square",
    unicode: "2b1b",
    shortname: ":black_large_square:",
    code: "&#11035;",
    category: "s",
    emoji_order: "2165",
    char: "⬛"
  },
  {
    name: "white_large_square",
    unicode: "2b1c",
    shortname: ":white_large_square:",
    code: "&#11036;",
    category: "s",
    emoji_order: "2166",
    char: "⬜"
  },
  {
    name: "large_orange_diamond",
    unicode: "1f536",
    shortname: ":large_orange_diamond:",
    code: "&#128310;",
    category: "s",
    emoji_order: "2167",
    char: "🔶"
  },
  {
    name: "large_blue_diamond",
    unicode: "1f537",
    shortname: ":large_blue_diamond:",
    code: "&#128311;",
    category: "s",
    emoji_order: "2168",
    char: "🔷"
  },
  {
    name: "small_orange_diamond",
    unicode: "1f538",
    shortname: ":small_orange_diamond:",
    code: "&#128312;",
    category: "s",
    emoji_order: "2169",
    char: "🔸"
  },
  {
    name: "small_blue_diamond",
    unicode: "1f539",
    shortname: ":small_blue_diamond:",
    code: "&#128313;",
    category: "s",
    emoji_order: "2170",
    char: "🔹"
  },
  {
    name: "small_red_triangle",
    unicode: "1f53a",
    shortname: ":small_red_triangle:",
    code: "&#128314;",
    category: "s",
    emoji_order: "2171",
    char: "🔺"
  },
  {
    name: "small_red_triangle_down",
    unicode: "1f53b",
    shortname: ":small_red_triangle_down:",
    code: "&#128315;",
    category: "s",
    emoji_order: "2172",
    char: "🔻"
  },
  {
    name: "diamond_shape_with_a_dot_inside",
    unicode: "1f4a0",
    shortname: ":diamond_shape_with_a_dot_inside:",
    code: "&#128160;",
    category: "s",
    emoji_order: "2173",
    char: "💠"
  },
  {
    name: "radio_button",
    unicode: "1f518",
    shortname: ":radio_button:",
    code: "&#128280;",
    category: "s",
    emoji_order: "2174",
    char: "🔘"
  },
  {
    name: "black_square_button",
    unicode: "1f532",
    shortname: ":black_square_button:",
    code: "&#128306;",
    category: "s",
    emoji_order: "2175",
    char: "🔲"
  },
  {
    name: "white_square_button",
    unicode: "1f533",
    shortname: ":white_square_button:",
    code: "&#128307;",
    category: "s",
    emoji_order: "2176",
    char: "🔳"
  },
  {
    name: "white_circle",
    unicode: "26aa",
    shortname: ":white_circle:",
    code: "&#9898;",
    category: "s",
    emoji_order: "2177",
    char: "⚪"
  },
  {
    name: "black_circle",
    unicode: "26ab",
    shortname: ":black_circle:",
    code: "&#9899;",
    category: "s",
    emoji_order: "2178",
    char: "⚫"
  },
  {
    name: "red_circle",
    unicode: "1f534",
    shortname: ":red_circle:",
    code: "&#128308;",
    category: "s",
    emoji_order: "2179",
    char: "🔴"
  },
  {
    name: "large_blue_circle",
    unicode: "1f535",
    shortname: ":blue_circle:",
    code: "&#128309;",
    category: "s",
    emoji_order: "2180",
    char: "🔵"
  },
  {
    name: "checkered_flag",
    unicode: "1f3c1",
    shortname: ":checkered_flag:",
    code: "&#127937;",
    category: "t",
    emoji_order: "2181",
    char: "🏁"
  },
  {
    name: "triangular_flag_on_post",
    unicode: "1f6a9",
    shortname: ":triangular_flag_on_post:",
    code: "&#128681;",
    category: "o",
    emoji_order: "2182",
    char: "🚩"
  },
  {
    name: "crossed_flags",
    unicode: "1f38c",
    shortname: ":crossed_flags:",
    code: "&#127884;",
    category: "o",
    emoji_order: "2183",
    char: "🎌"
  },
  {
    name: "waving_black_flag",
    unicode: "1f3f4",
    shortname: ":flag_black:",
    code: "&#127988;",
    category: "o",
    emoji_order: "2184",
    char: "🏴"
  },
  {
    name: "waving_white_flag",
    unicode: "1f3f3",
    shortname: ":flag_white:",
    code: "&#127987;",
    category: "o",
    emoji_order: "2185",
    char: "🏳"
  },
  {
    name: "flag-ac",
    unicode: "1f1e6-1f1e8",
    shortname: ":flag_ac:",
    code: "&#127462;&#127464;",
    category: "f",
    emoji_order: "2187",
    char: "🇦🇨"
  },
  {
    name: "flag-ad",
    unicode: "1f1e6-1f1e9",
    shortname: ":flag_ad:",
    code: "&#127462;&#127465;",
    category: "f",
    emoji_order: "2188",
    char: "🇦🇩"
  },
  {
    name: "flag-ae",
    unicode: "1f1e6-1f1ea",
    shortname: ":flag_ae:",
    code: "&#127462;&#127466;",
    category: "f",
    emoji_order: "2189",
    char: "🇦🇪"
  },
  {
    name: "flag-af",
    unicode: "1f1e6-1f1eb",
    shortname: ":flag_af:",
    code: "&#127462;&#127467;",
    category: "f",
    emoji_order: "2190",
    char: "🇦🇫"
  },
  {
    name: "flag-ag",
    unicode: "1f1e6-1f1ec",
    shortname: ":flag_ag:",
    code: "&#127462;&#127468;",
    category: "f",
    emoji_order: "2191",
    char: "🇦🇬"
  },
  {
    name: "flag-ai",
    unicode: "1f1e6-1f1ee",
    shortname: ":flag_ai:",
    code: "&#127462;&#127470;",
    category: "f",
    emoji_order: "2192",
    char: "🇦🇮"
  },
  {
    name: "flag-al",
    unicode: "1f1e6-1f1f1",
    shortname: ":flag_al:",
    code: "&#127462;&#127473;",
    category: "f",
    emoji_order: "2193",
    char: "🇦🇱"
  },
  {
    name: "flag-am",
    unicode: "1f1e6-1f1f2",
    shortname: ":flag_am:",
    code: "&#127462;&#127474;",
    category: "f",
    emoji_order: "2194",
    char: "🇦🇲"
  },
  {
    name: "flag-ao",
    unicode: "1f1e6-1f1f4",
    shortname: ":flag-ao:",
    code: "&#127462;&#127476;",
    category: "f",
    emoji_order: "2195",
    char: "🇦🇴"
  },
  {
    name: "flag-aq",
    unicode: "1f1e6-1f1f6",
    shortname: ":flag-aq:",
    code: "&#127462;&#127478;",
    category: "f",
    emoji_order: "2196",
    char: "🇦🇶"
  },
  {
    name: "flag-ar",
    unicode: "1f1e6-1f1f7",
    shortname: ":flag-ar:",
    code: "&#127462;&#127479;",
    category: "f",
    emoji_order: "2197",
    char: "🇦🇷"
  },
  {
    name: "flag-as",
    unicode: "1f1e6-1f1f8",
    shortname: ":flag-as:",
    code: "&#127462;&#127480;",
    category: "f",
    emoji_order: "2198",
    char: "🇦🇸"
  },
  {
    name: "flag-at",
    unicode: "1f1e6-1f1f9",
    shortname: ":flag-at:",
    code: "&#127462;&#127481;",
    category: "f",
    emoji_order: "2199",
    char: "🇦🇹"
  },
  {
    name: "flag-au",
    unicode: "1f1e6-1f1fa",
    shortname: ":flag-au:",
    code: "&#127462;&#127482;",
    category: "f",
    emoji_order: "2200",
    char: "🇦🇺"
  },
  {
    name: "flag-aw",
    unicode: "1f1e6-1f1fc",
    shortname: ":flag-aw:",
    code: "&#127462;&#127484;",
    category: "f",
    emoji_order: "2201",
    char: "🇦🇼"
  },
  {
    name: "flag-ax",
    unicode: "1f1e6-1f1fd",
    shortname: ":flag-ax:",
    code: "&#127462;&#127485;",
    category: "f",
    emoji_order: "2202",
    char: "🇦🇽"
  },
  {
    name: "flag-az",
    unicode: "1f1e6-1f1ff",
    shortname: ":flag-az:",
    code: "&#127462;&#127487;",
    category: "f",
    emoji_order: "2203",
    char: "🇦🇿"
  },
  {
    name: "flag-ba",
    unicode: "1f1e7-1f1e6",
    shortname: ":flag-ba:",
    code: "&#127463;&#127462;",
    category: "f",
    emoji_order: "2204",
    char: "🇧🇦"
  },
  {
    name: "flag-bb",
    unicode: "1f1e7-1f1e7",
    shortname: ":flag-bb:",
    code: "&#127463;&#127463;",
    category: "f",
    emoji_order: "2205",
    char: "🇧🇧"
  },
  {
    name: "flag-bd",
    unicode: "1f1e7-1f1e9",
    shortname: ":flag-bd:",
    code: "&#127463;&#127465;",
    category: "f",
    emoji_order: "2206",
    char: "🇧🇩"
  },
  {
    name: "flag-be",
    unicode: "1f1e7-1f1ea",
    shortname: ":flag-be:",
    code: "&#127463;&#127466;",
    category: "f",
    emoji_order: "2207",
    char: "🇧🇪"
  },
  {
    name: "flag-bf",
    unicode: "1f1e7-1f1eb",
    shortname: ":flag-bf:",
    code: "&#127463;&#127467;",
    category: "f",
    emoji_order: "2208",
    char: "🇧🇫"
  },
  {
    name: "flag-bg",
    unicode: "1f1e7-1f1ec",
    shortname: ":flag-bg:",
    code: "&#127463;&#127468;",
    category: "f",
    emoji_order: "2209",
    char: "🇧🇬"
  },
  {
    name: "flag-bh",
    unicode: "1f1e7-1f1ed",
    shortname: ":flag-bh:",
    code: "&#127463;&#127469;",
    category: "f",
    emoji_order: "2210",
    char: "🇧🇭"
  },
  {
    name: "flag-bi",
    unicode: "1f1e7-1f1ee",
    shortname: ":flag-bi:",
    code: "&#127463;&#127470;",
    category: "f",
    emoji_order: "2211",
    char: "🇧🇮"
  },
  {
    name: "flag-bj",
    unicode: "1f1e7-1f1ef",
    shortname: ":flag-bj:",
    code: "&#127463;&#127471;",
    category: "f",
    emoji_order: "2212",
    char: "🇧🇯"
  },
  {
    name: "flag-bl",
    unicode: "1f1e7-1f1f1",
    shortname: ":flag-bl:",
    code: "&#127463;&#127473;",
    category: "f",
    emoji_order: "2213",
    char: "🇧🇱"
  },
  {
    name: "flag-bm",
    unicode: "1f1e7-1f1f2",
    shortname: ":flag-bm:",
    code: "&#127463;&#127474;",
    category: "f",
    emoji_order: "2214",
    char: "🇧🇲"
  },
  {
    name: "flag-bn",
    unicode: "1f1e7-1f1f3",
    shortname: ":flag-bn:",
    code: "&#127463;&#127475;",
    category: "f",
    emoji_order: "2215",
    char: "🇧🇳"
  },
  {
    name: "flag-bo",
    unicode: "1f1e7-1f1f4",
    shortname: ":flag-bo:",
    code: "&#127463;&#127476;",
    category: "f",
    emoji_order: "2216",
    char: "🇧🇴"
  },
  {
    name: "flag-bq",
    unicode: "1f1e7-1f1f6",
    shortname: ":flag-bq:",
    code: "&#127463;&#127478;",
    category: "f",
    emoji_order: "2217",
    char: "🇧🇶"
  },
  {
    name: "flag-br",
    unicode: "1f1e7-1f1f7",
    shortname: ":flag-br:",
    code: "&#127463;&#127479;",
    category: "f",
    emoji_order: "2218",
    char: "🇧🇷"
  },
  {
    name: "flag-bs",
    unicode: "1f1e7-1f1f8",
    shortname: ":flag-bs:",
    code: "&#127463;&#127480;",
    category: "f",
    emoji_order: "2219",
    char: "🇧🇸"
  },
  {
    name: "flag-bt",
    unicode: "1f1e7-1f1f9",
    shortname: ":flag-bt:",
    code: "&#127463;&#127481;",
    category: "f",
    emoji_order: "2220",
    char: "🇧🇹"
  },
  {
    name: "flag-bv",
    unicode: "1f1e7-1f1fb",
    shortname: ":flag-bv:",
    code: "&#127463;&#127483;",
    category: "f",
    emoji_order: "2221",
    char: "🇧🇻"
  },
  {
    name: "flag-bw",
    unicode: "1f1e7-1f1fc",
    shortname: ":flag-bw:",
    code: "&#127463;&#127484;",
    category: "f",
    emoji_order: "2222",
    char: "🇧🇼"
  },
  {
    name: "flag-by",
    unicode: "1f1e7-1f1fe",
    shortname: ":flag-by:",
    code: "&#127463;&#127486;",
    category: "f",
    emoji_order: "2223",
    char: "🇧🇾"
  },
  {
    name: "flag-bz",
    unicode: "1f1e7-1f1ff",
    shortname: ":flag-bz:",
    code: "&#127463;&#127487;",
    category: "f",
    emoji_order: "2224",
    char: "🇧🇿"
  },
  {
    name: "flag-ca",
    unicode: "1f1e8-1f1e6",
    shortname: ":flag-ca:",
    code: "&#127464;&#127462;",
    category: "f",
    emoji_order: "2225",
    char: "🇨🇦"
  },
  {
    name: "flag-cc",
    unicode: "1f1e8-1f1e8",
    shortname: ":flag-cc:",
    code: "&#127464;&#127464;",
    category: "f",
    emoji_order: "2226",
    char: "🇨🇨"
  },
  {
    name: "flag-cd",
    unicode: "1f1e8-1f1e9",
    shortname: ":flag-cd:",
    code: "&#127464;&#127465;",
    category: "f",
    emoji_order: "2227",
    char: "🇨🇩"
  },
  {
    name: "flag-cf",
    unicode: "1f1e8-1f1eb",
    shortname: ":flag-cf:",
    code: "&#127464;&#127467;",
    category: "f",
    emoji_order: "2228",
    char: "🇨🇫"
  },
  {
    name: "flag-cg",
    unicode: "1f1e8-1f1ec",
    shortname: ":flag-cg:",
    code: "&#127464;&#127468;",
    category: "f",
    emoji_order: "2229",
    char: "🇨🇬"
  },
  {
    name: "flag-ch",
    unicode: "1f1e8-1f1ed",
    shortname: ":flag-ch:",
    code: "&#127464;&#127469;",
    category: "f",
    emoji_order: "2230",
    char: "🇨🇭"
  },
  {
    name: "flag-ci",
    unicode: "1f1e8-1f1ee",
    shortname: ":flag-ci:",
    code: "&#127464;&#127470;",
    category: "f",
    emoji_order: "2231",
    char: "🇨🇮"
  },
  {
    name: "flag-ck",
    unicode: "1f1e8-1f1f0",
    shortname: ":flag-ck:",
    code: "&#127464;&#127472;",
    category: "f",
    emoji_order: "2232",
    char: "🇨🇰"
  },
  {
    name: "flag-cl",
    unicode: "1f1e8-1f1f1",
    shortname: ":flag-cl:",
    code: "&#127464;&#127473;",
    category: "f",
    emoji_order: "2233",
    char: "🇨🇱"
  },
  {
    name: "flag-cm",
    unicode: "1f1e8-1f1f2",
    shortname: ":flag-cm:",
    code: "&#127464;&#127474;",
    category: "f",
    emoji_order: "2234",
    char: "🇨🇲"
  },
  {
    name: "flag-cn",
    unicode: "1f1e8-1f1f3",
    shortname: ":flag-cn:",
    code: "&#127464;&#127475;",
    category: "f",
    emoji_order: "2235",
    char: "🇨🇳"
  },
  {
    name: "flag-co",
    unicode: "1f1e8-1f1f4",
    shortname: ":flag-co:",
    code: "&#127464;&#127476;",
    category: "f",
    emoji_order: "2236",
    char: "🇨🇴"
  },
  {
    name: "flag-cp",
    unicode: "1f1e8-1f1f5",
    shortname: ":flag-cp:",
    code: "&#127464;&#127477;",
    category: "f",
    emoji_order: "2237",
    char: "🇨🇵"
  },
  {
    name: "flag-cr",
    unicode: "1f1e8-1f1f7",
    shortname: ":flag-cr:",
    code: "&#127464;&#127479;",
    category: "f",
    emoji_order: "2238",
    char: "🇨🇷"
  },
  {
    name: "flag-cu",
    unicode: "1f1e8-1f1fa",
    shortname: ":flag-cu:",
    code: "&#127464;&#127482;",
    category: "f",
    emoji_order: "2239",
    char: "🇨🇺"
  },
  {
    name: "flag-cv",
    unicode: "1f1e8-1f1fb",
    shortname: ":flag-cv:",
    code: "&#127464;&#127483;",
    category: "f",
    emoji_order: "2240",
    char: "🇨🇻"
  },
  {
    name: "flag-cw",
    unicode: "1f1e8-1f1fc",
    shortname: ":flag-cw:",
    code: "&#127464;&#127484;",
    category: "f",
    emoji_order: "2241",
    char: "🇨🇼"
  },
  {
    name: "flag-cx",
    unicode: "1f1e8-1f1fd",
    shortname: ":flag-cx:",
    code: "&#127464;&#127485;",
    category: "f",
    emoji_order: "2242",
    char: "🇨🇽"
  },
  {
    name: "flag-cy",
    unicode: "1f1e8-1f1fe",
    shortname: ":flag-cy:",
    code: "&#127464;&#127486;",
    category: "f",
    emoji_order: "2243",
    char: "🇨🇾"
  },
  {
    name: "flag-cz",
    unicode: "1f1e8-1f1ff",
    shortname: ":flag-cz:",
    code: "&#127464;&#127487;",
    category: "f",
    emoji_order: "2244",
    char: "🇨🇿"
  },
  {
    name: "flag-de",
    unicode: "1f1e9-1f1ea",
    shortname: ":flag-de:",
    code: "&#127465;&#127466;",
    category: "f",
    emoji_order: "2245",
    char: "🇩🇪"
  },
  {
    name: "flag-dg",
    unicode: "1f1e9-1f1ec",
    shortname: ":flag-dg:",
    code: "&#127465;&#127468;",
    category: "f",
    emoji_order: "2246",
    char: "🇩🇬"
  },
  {
    name: "flag-dj",
    unicode: "1f1e9-1f1ef",
    shortname: ":flag-dj:",
    code: "&#127465;&#127471;",
    category: "f",
    emoji_order: "2247",
    char: "🇩🇯"
  },
  {
    name: "flag-dk",
    unicode: "1f1e9-1f1f0",
    shortname: ":flag-dk:",
    code: "&#127465;&#127472;",
    category: "f",
    emoji_order: "2248",
    char: "🇩🇰"
  },
  {
    name: "flag-dm",
    unicode: "1f1e9-1f1f2",
    shortname: ":flag-dm:",
    code: "&#127465;&#127474;",
    category: "f",
    emoji_order: "2249",
    char: "🇩🇲"
  },
  {
    name: "flag-do",
    unicode: "1f1e9-1f1f4",
    shortname: ":flag-do:",
    code: "&#127465;&#127476;",
    category: "f",
    emoji_order: "2250",
    char: "🇩🇴"
  },
  {
    name: "flag-dz",
    unicode: "1f1e9-1f1ff",
    shortname: ":flag-dz:",
    code: "&#127465;&#127487;",
    category: "f",
    emoji_order: "2251",
    char: "🇩🇿"
  },
  {
    name: "flag-ea",
    unicode: "1f1ea-1f1e6",
    shortname: ":flag-ea:",
    code: "&#127466;&#127462;",
    category: "f",
    emoji_order: "2252",
    char: "🇪🇦"
  },
  {
    name: "flag-ec",
    unicode: "1f1ea-1f1e8",
    shortname: ":flag-ec:",
    code: "&#127466;&#127464;",
    category: "f",
    emoji_order: "2253",
    char: "🇪🇨"
  },
  {
    name: "flag-ee",
    unicode: "1f1ea-1f1ea",
    shortname: ":flag-ee:",
    code: "&#127466;&#127466;",
    category: "f",
    emoji_order: "2254",
    char: "🇪🇪"
  },
  {
    name: "flag-eg",
    unicode: "1f1ea-1f1ec",
    shortname: ":flag-eg:",
    code: "&#127466;&#127468;",
    category: "f",
    emoji_order: "2255",
    char: "🇪🇬"
  },
  {
    name: "flag-eh",
    unicode: "1f1ea-1f1ed",
    shortname: ":flag-eh:",
    code: "&#127466;&#127469;",
    category: "f",
    emoji_order: "2256",
    char: "🇪🇭"
  },
  {
    name: "flag-er",
    unicode: "1f1ea-1f1f7",
    shortname: ":flag-er:",
    code: "&#127466;&#127479;",
    category: "f",
    emoji_order: "2257",
    char: "🇪🇷"
  },
  {
    name: "flag-es",
    unicode: "1f1ea-1f1f8",
    shortname: ":flag-es:",
    code: "&#127466;&#127480;",
    category: "f",
    emoji_order: "2258",
    char: "🇪🇸"
  },
  {
    name: "flag-et",
    unicode: "1f1ea-1f1f9",
    shortname: ":flag-et:",
    code: "&#127466;&#127481;",
    category: "f",
    emoji_order: "2259",
    char: "🇪🇹"
  },
  {
    name: "flag-eu",
    unicode: "1f1ea-1f1fa",
    shortname: ":flag-eu:",
    code: "&#127466;&#127482;",
    category: "f",
    emoji_order: "2260",
    char: "🇪🇺"
  },
  {
    name: "flag-fi",
    unicode: "1f1eb-1f1ee",
    shortname: ":flag-fi:",
    code: "&#127467;&#127470;",
    category: "f",
    emoji_order: "2261",
    char: "🇫🇮"
  },
  {
    name: "flag-fj",
    unicode: "1f1eb-1f1ef",
    shortname: ":flag-fj:",
    code: "&#127467;&#127471;",
    category: "f",
    emoji_order: "2262",
    char: "🇫🇯"
  },
  {
    name: "flag-fk",
    unicode: "1f1eb-1f1f0",
    shortname: ":flag-fk:",
    code: "&#127467;&#127472;",
    category: "f",
    emoji_order: "2263",
    char: "🇫🇰"
  },
  {
    name: "flag-fm",
    unicode: "1f1eb-1f1f2",
    shortname: ":flag-fm:",
    code: "&#127467;&#127474;",
    category: "f",
    emoji_order: "2264",
    char: "🇫🇲"
  },
  {
    name: "flag-fo",
    unicode: "1f1eb-1f1f4",
    shortname: ":flag-fo:",
    code: "&#127467;&#127476;",
    category: "f",
    emoji_order: "2265",
    char: "🇫🇴"
  },
  {
    name: "flag-fr",
    unicode: "1f1eb-1f1f7",
    shortname: ":flag-fr:",
    code: "&#127467;&#127479;",
    category: "f",
    emoji_order: "2266",
    char: "🇫🇷"
  },
  {
    name: "flag-ga",
    unicode: "1f1ec-1f1e6",
    shortname: ":flag-ga:",
    code: "&#127468;&#127462;",
    category: "f",
    emoji_order: "2267",
    char: "🇬🇦"
  },
  {
    name: "flag-gb",
    unicode: "1f1ec-1f1e7",
    shortname: ":flag-gb:",
    code: "&#127468;&#127463;",
    category: "f",
    emoji_order: "2268",
    char: "🇬🇧"
  },
  {
    name: "flag-gd",
    unicode: "1f1ec-1f1e9",
    shortname: ":flag-gd:",
    code: "&#127468;&#127465;",
    category: "f",
    emoji_order: "2269",
    char: "🇬🇩"
  },
  {
    name: "flag-ge",
    unicode: "1f1ec-1f1ea",
    shortname: ":flag-ge:",
    code: "&#127468;&#127466;",
    category: "f",
    emoji_order: "2270",
    char: "🇬🇪"
  },
  {
    name: "flag-gf",
    unicode: "1f1ec-1f1eb",
    shortname: ":flag-gf:",
    code: "&#127468;&#127467;",
    category: "f",
    emoji_order: "2271",
    char: "🇬🇫"
  },
  {
    name: "flag-gg",
    unicode: "1f1ec-1f1ec",
    shortname: ":flag-gg:",
    code: "&#127468;&#127468;",
    category: "f",
    emoji_order: "2272",
    char: "🇬🇬"
  },
  {
    name: "flag-gh",
    unicode: "1f1ec-1f1ed",
    shortname: ":flag-gh:",
    code: "&#127468;&#127469;",
    category: "f",
    emoji_order: "2273",
    char: "🇬🇭"
  },
  {
    name: "flag-gi",
    unicode: "1f1ec-1f1ee",
    shortname: ":flag-gi:",
    code: "&#127468;&#127470;",
    category: "f",
    emoji_order: "2274",
    char: "🇬🇮"
  },
  {
    name: "flag-gl",
    unicode: "1f1ec-1f1f1",
    shortname: ":flag-gl:",
    code: "&#127468;&#127473;",
    category: "f",
    emoji_order: "2275",
    char: "🇬🇱"
  },
  {
    name: "flag-gm",
    unicode: "1f1ec-1f1f2",
    shortname: ":flag-gm:",
    code: "&#127468;&#127474;",
    category: "f",
    emoji_order: "2276",
    char: "🇬🇲"
  },
  {
    name: "flag-gn",
    unicode: "1f1ec-1f1f3",
    shortname: ":flag-gn:",
    code: "&#127468;&#127475;",
    category: "f",
    emoji_order: "2277",
    char: "🇬🇳"
  },
  {
    name: "flag-gp",
    unicode: "1f1ec-1f1f5",
    shortname: ":flag-gp:",
    code: "&#127468;&#127477;",
    category: "f",
    emoji_order: "2278",
    char: "🇬🇵"
  },
  {
    name: "flag-gq",
    unicode: "1f1ec-1f1f6",
    shortname: ":flag-gq:",
    code: "&#127468;&#127478;",
    category: "f",
    emoji_order: "2279",
    char: "🇬🇶"
  },
  {
    name: "flag-gr",
    unicode: "1f1ec-1f1f7",
    shortname: ":flag-gr:",
    code: "&#127468;&#127479;",
    category: "f",
    emoji_order: "2280",
    char: "🇬🇷"
  },
  {
    name: "flag-gs",
    unicode: "1f1ec-1f1f8",
    shortname: ":flag-gs:",
    code: "&#127468;&#127480;",
    category: "f",
    emoji_order: "2281",
    char: "🇬🇸"
  },
  {
    name: "flag-gt",
    unicode: "1f1ec-1f1f9",
    shortname: ":flag-gt:",
    code: "&#127468;&#127481;",
    category: "f",
    emoji_order: "2282",
    char: "🇬🇹"
  },
  {
    name: "flag-gu",
    unicode: "1f1ec-1f1fa",
    shortname: ":flag-gu:",
    code: "&#127468;&#127482;",
    category: "f",
    emoji_order: "2283",
    char: "🇬🇺"
  },
  {
    name: "flag-gw",
    unicode: "1f1ec-1f1fc",
    shortname: ":flag-gw:",
    code: "&#127468;&#127484;",
    category: "f",
    emoji_order: "2284",
    char: "🇬🇼"
  },
  {
    name: "flag-gy",
    unicode: "1f1ec-1f1fe",
    shortname: ":flag-gy:",
    code: "&#127468;&#127486;",
    category: "f",
    emoji_order: "2285",
    char: "🇬🇾"
  },
  {
    name: "flag-hk",
    unicode: "1f1ed-1f1f0",
    shortname: ":flag-hk:",
    code: "&#127469;&#127472;",
    category: "f",
    emoji_order: "2286",
    char: "🇭🇰"
  },
  {
    name: "flag-hm",
    unicode: "1f1ed-1f1f2",
    shortname: ":flag-hm:",
    code: "&#127469;&#127474;",
    category: "f",
    emoji_order: "2287",
    char: "🇭🇲"
  },
  {
    name: "flag-hn",
    unicode: "1f1ed-1f1f3",
    shortname: ":flag-hn:",
    code: "&#127469;&#127475;",
    category: "f",
    emoji_order: "2288",
    char: "🇭🇳"
  },
  {
    name: "flag-hr",
    unicode: "1f1ed-1f1f7",
    shortname: ":flag-hr:",
    code: "&#127469;&#127479;",
    category: "f",
    emoji_order: "2289",
    char: "🇭🇷"
  },
  {
    name: "flag-ht",
    unicode: "1f1ed-1f1f9",
    shortname: ":flag-ht:",
    code: "&#127469;&#127481;",
    category: "f",
    emoji_order: "2290",
    char: "🇭🇹"
  },
  {
    name: "flag-hu",
    unicode: "1f1ed-1f1fa",
    shortname: ":flag-hu:",
    code: "&#127469;&#127482;",
    category: "f",
    emoji_order: "2291",
    char: "🇭🇺"
  },
  {
    name: "flag-ic",
    unicode: "1f1ee-1f1e8",
    shortname: ":flag-ic:",
    code: "&#127470;&#127464;",
    category: "f",
    emoji_order: "2292",
    char: "🇮🇨"
  },
  {
    name: "flag-id",
    unicode: "1f1ee-1f1e9",
    shortname: ":flag-id:",
    code: "&#127470;&#127465;",
    category: "f",
    emoji_order: "2293",
    char: "🇮🇩"
  },
  {
    name: "flag-ie",
    unicode: "1f1ee-1f1ea",
    shortname: ":flag-ie:",
    code: "&#127470;&#127466;",
    category: "f",
    emoji_order: "2294",
    char: "🇮🇪"
  },
  {
    name: "flag-il",
    unicode: "1f1ee-1f1f1",
    shortname: ":flag-il:",
    code: "&#127470;&#127473;",
    category: "f",
    emoji_order: "2295",
    char: "🇮🇱"
  },
  {
    name: "flag-im",
    unicode: "1f1ee-1f1f2",
    shortname: ":flag-im:",
    code: "&#127470;&#127474;",
    category: "f",
    emoji_order: "2296",
    char: "🇮🇲"
  },
  {
    name: "flag-in",
    unicode: "1f1ee-1f1f3",
    shortname: ":flag-in:",
    code: "&#127470;&#127475;",
    category: "f",
    emoji_order: "2297",
    char: "🇮🇳"
  },
  {
    name: "flag-io",
    unicode: "1f1ee-1f1f4",
    shortname: ":flag-io:",
    code: "&#127470;&#127476;",
    category: "f",
    emoji_order: "2298",
    char: "🇮🇴"
  },
  {
    name: "flag-iq",
    unicode: "1f1ee-1f1f6",
    shortname: ":flag-iq:",
    code: "&#127470;&#127478;",
    category: "f",
    emoji_order: "2299",
    char: "🇮🇶"
  },
  {
    name: "flag-ir",
    unicode: "1f1ee-1f1f7",
    shortname: ":flag-ir:",
    code: "&#127470;&#127479;",
    category: "f",
    emoji_order: "2300",
    char: "🇮🇷"
  },
  {
    name: "flag-is",
    unicode: "1f1ee-1f1f8",
    shortname: ":flag-is:",
    code: "&#127470;&#127480;",
    category: "f",
    emoji_order: "2301",
    char: "🇮🇸"
  },
  {
    name: "flag-it",
    unicode: "1f1ee-1f1f9",
    shortname: ":flag-it:",
    code: "&#127470;&#127481;",
    category: "f",
    emoji_order: "2302",
    char: "🇮🇹"
  },
  {
    name: "flag-je",
    unicode: "1f1ef-1f1ea",
    shortname: ":flag-je:",
    code: "&#127471;&#127466;",
    category: "f",
    emoji_order: "2303",
    char: "🇯🇪"
  },
  {
    name: "flag-jm",
    unicode: "1f1ef-1f1f2",
    shortname: ":flag-jm:",
    code: "&#127471;&#127474;",
    category: "f",
    emoji_order: "2304",
    char: "🇯🇲"
  },
  {
    name: "flag-jo",
    unicode: "1f1ef-1f1f4",
    shortname: ":flag-jo:",
    code: "&#127471;&#127476;",
    category: "f",
    emoji_order: "2305",
    char: "🇯🇴"
  },
  {
    name: "flag-jp",
    unicode: "1f1ef-1f1f5",
    shortname: ":flag-jp:",
    code: "&#127471;&#127477;",
    category: "f",
    emoji_order: "2306",
    char: "🇯🇵"
  },
  {
    name: "flag-ke",
    unicode: "1f1f0-1f1ea",
    shortname: ":flag-ke:",
    code: "&#127472;&#127466;",
    category: "f",
    emoji_order: "2307",
    char: "🇰🇪"
  },
  {
    name: "flag-kg",
    unicode: "1f1f0-1f1ec",
    shortname: ":flag-kg:",
    code: "&#127472;&#127468;",
    category: "f",
    emoji_order: "2308",
    char: "🇰🇬"
  },
  {
    name: "flag-kh",
    unicode: "1f1f0-1f1ed",
    shortname: ":flag-kh:",
    code: "&#127472;&#127469;",
    category: "f",
    emoji_order: "2309",
    char: "🇰🇭"
  },
  {
    name: "flag-ki",
    unicode: "1f1f0-1f1ee",
    shortname: ":flag-ki:",
    code: "&#127472;&#127470;",
    category: "f",
    emoji_order: "2310",
    char: "🇰🇮"
  },
  {
    name: "flag-km",
    unicode: "1f1f0-1f1f2",
    shortname: ":flag-km:",
    code: "&#127472;&#127474;",
    category: "f",
    emoji_order: "2311",
    char: "🇰🇲"
  },
  {
    name: "flag-kn",
    unicode: "1f1f0-1f1f3",
    shortname: ":flag-kn:",
    code: "&#127472;&#127475;",
    category: "f",
    emoji_order: "2312",
    char: "🇰🇳"
  },
  {
    name: "flag-kp",
    unicode: "1f1f0-1f1f5",
    shortname: ":flag-kp:",
    code: "&#127472;&#127477;",
    category: "f",
    emoji_order: "2313",
    char: "🇰🇵"
  },
  {
    name: "flag-kr",
    unicode: "1f1f0-1f1f7",
    shortname: ":flag-kr:",
    code: "&#127472;&#127479;",
    category: "f",
    emoji_order: "2314",
    char: "🇰🇷"
  },
  {
    name: "flag-kw",
    unicode: "1f1f0-1f1fc",
    shortname: ":flag-kw:",
    code: "&#127472;&#127484;",
    category: "f",
    emoji_order: "2315",
    char: "🇰🇼"
  },
  {
    name: "flag-ky",
    unicode: "1f1f0-1f1fe",
    shortname: ":flag-ky:",
    code: "&#127472;&#127486;",
    category: "f",
    emoji_order: "2316",
    char: "🇰🇾"
  },
  {
    name: "flag-kz",
    unicode: "1f1f0-1f1ff",
    shortname: ":flag-kz:",
    code: "&#127472;&#127487;",
    category: "f",
    emoji_order: "2317",
    char: "🇰🇿"
  },
  {
    name: "flag-la",
    unicode: "1f1f1-1f1e6",
    shortname: ":flag-la:",
    code: "&#127473;&#127462;",
    category: "f",
    emoji_order: "2318",
    char: "🇱🇦"
  },
  {
    name: "flag-lb",
    unicode: "1f1f1-1f1e7",
    shortname: ":flag-lb:",
    code: "&#127473;&#127463;",
    category: "f",
    emoji_order: "2319",
    char: "🇱🇧"
  },
  {
    name: "flag-lc",
    unicode: "1f1f1-1f1e8",
    shortname: ":flag-lc:",
    code: "&#127473;&#127464;",
    category: "f",
    emoji_order: "2320",
    char: "🇱🇨"
  },
  {
    name: "flag-li",
    unicode: "1f1f1-1f1ee",
    shortname: ":flag-li:",
    code: "&#127473;&#127470;",
    category: "f",
    emoji_order: "2321",
    char: "🇱🇮"
  },
  {
    name: "flag-lk",
    unicode: "1f1f1-1f1f0",
    shortname: ":flag-lk:",
    code: "&#127473;&#127472;",
    category: "f",
    emoji_order: "2322",
    char: "🇱🇰"
  },
  {
    name: "flag-lr",
    unicode: "1f1f1-1f1f7",
    shortname: ":flag-lr:",
    code: "&#127473;&#127479;",
    category: "f",
    emoji_order: "2323",
    char: "🇱🇷"
  },
  {
    name: "flag-ls",
    unicode: "1f1f1-1f1f8",
    shortname: ":flag-ls:",
    code: "&#127473;&#127480;",
    category: "f",
    emoji_order: "2324",
    char: "🇱🇸"
  },
  {
    name: "flag-lt",
    unicode: "1f1f1-1f1f9",
    shortname: ":flag-lt:",
    code: "&#127473;&#127481;",
    category: "f",
    emoji_order: "2325",
    char: "🇱🇹"
  },
  {
    name: "flag-lu",
    unicode: "1f1f1-1f1fa",
    shortname: ":flag-lu:",
    code: "&#127473;&#127482;",
    category: "f",
    emoji_order: "2326",
    char: "🇱🇺"
  },
  {
    name: "flag-lv",
    unicode: "1f1f1-1f1fb",
    shortname: ":flag-lv:",
    code: "&#127473;&#127483;",
    category: "f",
    emoji_order: "2327",
    char: "🇱🇻"
  },
  {
    name: "flag-ly",
    unicode: "1f1f1-1f1fe",
    shortname: ":flag-ly:",
    code: "&#127473;&#127486;",
    category: "f",
    emoji_order: "2328",
    char: "🇱🇾"
  },
  {
    name: "flag-ma",
    unicode: "1f1f2-1f1e6",
    shortname: ":flag-ma:",
    code: "&#127474;&#127462;",
    category: "f",
    emoji_order: "2329",
    char: "🇲🇦"
  },
  {
    name: "flag-mc",
    unicode: "1f1f2-1f1e8",
    shortname: ":flag-mc:",
    code: "&#127474;&#127464;",
    category: "f",
    emoji_order: "2330",
    char: "🇲🇨"
  },
  {
    name: "flag-md",
    unicode: "1f1f2-1f1e9",
    shortname: ":flag-md:",
    code: "&#127474;&#127465;",
    category: "f",
    emoji_order: "2331",
    char: "🇲🇩"
  },
  {
    name: "flag-me",
    unicode: "1f1f2-1f1ea",
    shortname: ":flag-me:",
    code: "&#127474;&#127466;",
    category: "f",
    emoji_order: "2332",
    char: "🇲🇪"
  },
  {
    name: "flag-mf",
    unicode: "1f1f2-1f1eb",
    shortname: ":flag-mf:",
    code: "&#127474;&#127467;",
    category: "f",
    emoji_order: "2333",
    char: "🇲🇫"
  },
  {
    name: "flag-mg",
    unicode: "1f1f2-1f1ec",
    shortname: ":flag-mg:",
    code: "&#127474;&#127468;",
    category: "f",
    emoji_order: "2334",
    char: "🇲🇬"
  },
  {
    name: "flag-mh",
    unicode: "1f1f2-1f1ed",
    shortname: ":flag-mh:",
    code: "&#127474;&#127469;",
    category: "f",
    emoji_order: "2335",
    char: "🇲🇭"
  },
  {
    name: "flag-mk",
    unicode: "1f1f2-1f1f0",
    shortname: ":flag-mk:",
    code: "&#127474;&#127472;",
    category: "f",
    emoji_order: "2336",
    char: "🇲🇰"
  },
  {
    name: "flag-ml",
    unicode: "1f1f2-1f1f1",
    shortname: ":flag-ml:",
    code: "&#127474;&#127473;",
    category: "f",
    emoji_order: "2337",
    char: "🇲🇱"
  },
  {
    name: "flag-mm",
    unicode: "1f1f2-1f1f2",
    shortname: ":flag-mm:",
    code: "&#127474;&#127474;",
    category: "f",
    emoji_order: "2338",
    char: "🇲🇲"
  },
  {
    name: "flag-mn",
    unicode: "1f1f2-1f1f3",
    shortname: ":flag-mn:",
    code: "&#127474;&#127475;",
    category: "f",
    emoji_order: "2339",
    char: "🇲🇳"
  },
  {
    name: "flag-mo",
    unicode: "1f1f2-1f1f4",
    shortname: ":flag-mo:",
    code: "&#127474;&#127476;",
    category: "f",
    emoji_order: "2340",
    char: "🇲🇴"
  },
  {
    name: "flag-mp",
    unicode: "1f1f2-1f1f5",
    shortname: ":flag-mp:",
    code: "&#127474;&#127477;",
    category: "f",
    emoji_order: "2341",
    char: "🇲🇵"
  },
  {
    name: "flag-mq",
    unicode: "1f1f2-1f1f6",
    shortname: ":flag-mq:",
    code: "&#127474;&#127478;",
    category: "f",
    emoji_order: "2342",
    char: "🇲🇶"
  },
  {
    name: "flag-mr",
    unicode: "1f1f2-1f1f7",
    shortname: ":flag-mr:",
    code: "&#127474;&#127479;",
    category: "f",
    emoji_order: "2343",
    char: "🇲🇷"
  },
  {
    name: "flag-ms",
    unicode: "1f1f2-1f1f8",
    shortname: ":flag-ms:",
    code: "&#127474;&#127480;",
    category: "f",
    emoji_order: "2344",
    char: "🇲🇸"
  },
  {
    name: "flag-mt",
    unicode: "1f1f2-1f1f9",
    shortname: ":flag-mt:",
    code: "&#127474;&#127481;",
    category: "f",
    emoji_order: "2345",
    char: "🇲🇹"
  },
  {
    name: "flag-mu",
    unicode: "1f1f2-1f1fa",
    shortname: ":flag-mu:",
    code: "&#127474;&#127482;",
    category: "f",
    emoji_order: "2346",
    char: "🇲🇺"
  },
  {
    name: "flag-mv",
    unicode: "1f1f2-1f1fb",
    shortname: ":flag-mv:",
    code: "&#127474;&#127483;",
    category: "f",
    emoji_order: "2347",
    char: "🇲🇻"
  },
  {
    name: "flag-mw",
    unicode: "1f1f2-1f1fc",
    shortname: ":flag-mw:",
    code: "&#127474;&#127484;",
    category: "f",
    emoji_order: "2348",
    char: "🇲🇼"
  },
  {
    name: "flag-mx",
    unicode: "1f1f2-1f1fd",
    shortname: ":flag-mx:",
    code: "&#127474;&#127485;",
    category: "f",
    emoji_order: "2349",
    char: "🇲🇽"
  },
  {
    name: "flag-my",
    unicode: "1f1f2-1f1fe",
    shortname: ":flag-my:",
    code: "&#127474;&#127486;",
    category: "f",
    emoji_order: "2350",
    char: "🇲🇾"
  },
  {
    name: "flag-mz",
    unicode: "1f1f2-1f1ff",
    shortname: ":flag-mz:",
    code: "&#127474;&#127487;",
    category: "f",
    emoji_order: "2351",
    char: "🇲🇿"
  },
  {
    name: "flag-na",
    unicode: "1f1f3-1f1e6",
    shortname: ":flag-na:",
    code: "&#127475;&#127462;",
    category: "f",
    emoji_order: "2352",
    char: "🇳🇦"
  },
  {
    name: "flag-nc",
    unicode: "1f1f3-1f1e8",
    shortname: ":flag-nc:",
    code: "&#127475;&#127464;",
    category: "f",
    emoji_order: "2353",
    char: "🇳🇨"
  },
  {
    name: "flag-ne",
    unicode: "1f1f3-1f1ea",
    shortname: ":flag-ne:",
    code: "&#127475;&#127466;",
    category: "f",
    emoji_order: "2354",
    char: "🇳🇪"
  },
  {
    name: "flag-nf",
    unicode: "1f1f3-1f1eb",
    shortname: ":flag-nf:",
    code: "&#127475;&#127467;",
    category: "f",
    emoji_order: "2355",
    char: "🇳🇫"
  },
  {
    name: "flag-ng",
    unicode: "1f1f3-1f1ec",
    shortname: ":flag-ng:",
    code: "&#127475;&#127468;",
    category: "f",
    emoji_order: "2356",
    char: "🇳🇬"
  },
  {
    name: "flag-ni",
    unicode: "1f1f3-1f1ee",
    shortname: ":flag-ni:",
    code: "&#127475;&#127470;",
    category: "f",
    emoji_order: "2357",
    char: "🇳🇮"
  },
  {
    name: "flag-nl",
    unicode: "1f1f3-1f1f1",
    shortname: ":flag-nl:",
    code: "&#127475;&#127473;",
    category: "f",
    emoji_order: "2358",
    char: "🇳🇱"
  },
  {
    name: "flag-no",
    unicode: "1f1f3-1f1f4",
    shortname: ":flag-no:",
    code: "&#127475;&#127476;",
    category: "f",
    emoji_order: "2359",
    char: "🇳🇴"
  },
  {
    name: "flag-np",
    unicode: "1f1f3-1f1f5",
    shortname: ":flag-np:",
    code: "&#127475;&#127477;",
    category: "f",
    emoji_order: "2360",
    char: "🇳🇵"
  },
  {
    name: "flag-nr",
    unicode: "1f1f3-1f1f7",
    shortname: ":flag-nr:",
    code: "&#127475;&#127479;",
    category: "f",
    emoji_order: "2361",
    char: "🇳🇷"
  },
  {
    name: "flag-nu",
    unicode: "1f1f3-1f1fa",
    shortname: ":flag-nu:",
    code: "&#127475;&#127482;",
    category: "f",
    emoji_order: "2362",
    char: "🇳🇺"
  },
  {
    name: "flag-nz",
    unicode: "1f1f3-1f1ff",
    shortname: ":flag-nz:",
    code: "&#127475;&#127487;",
    category: "f",
    emoji_order: "2363",
    char: "🇳🇿"
  },
  {
    name: "flag-om",
    unicode: "1f1f4-1f1f2",
    shortname: ":flag-om:",
    code: "&#127476;&#127474;",
    category: "f",
    emoji_order: "2364",
    char: "🇴🇲"
  },
  {
    name: "flag-pa",
    unicode: "1f1f5-1f1e6",
    shortname: ":flag-pa:",
    code: "&#127477;&#127462;",
    category: "f",
    emoji_order: "2365",
    char: "🇵🇦"
  },
  {
    name: "flag-pe",
    unicode: "1f1f5-1f1ea",
    shortname: ":flag-pe:",
    code: "&#127477;&#127466;",
    category: "f",
    emoji_order: "2366",
    char: "🇵🇪"
  },
  {
    name: "flag-pf",
    unicode: "1f1f5-1f1eb",
    shortname: ":flag-pf:",
    code: "&#127477;&#127467;",
    category: "f",
    emoji_order: "2367",
    char: "🇵🇫"
  },
  {
    name: "flag-pg",
    unicode: "1f1f5-1f1ec",
    shortname: ":flag-pg:",
    code: "&#127477;&#127468;",
    category: "f",
    emoji_order: "2368",
    char: "🇵🇬"
  },
  {
    name: "flag-ph",
    unicode: "1f1f5-1f1ed",
    shortname: ":flag-ph:",
    code: "&#127477;&#127469;",
    category: "f",
    emoji_order: "2369",
    char: "🇵🇭"
  },
  {
    name: "flag-pk",
    unicode: "1f1f5-1f1f0",
    shortname: ":flag-pk:",
    code: "&#127477;&#127472;",
    category: "f",
    emoji_order: "2370",
    char: "🇵🇰"
  },
  {
    name: "flag-pl",
    unicode: "1f1f5-1f1f1",
    shortname: ":flag-pl:",
    code: "&#127477;&#127473;",
    category: "f",
    emoji_order: "2371",
    char: "🇵🇱"
  },
  {
    name: "flag-pm",
    unicode: "1f1f5-1f1f2",
    shortname: ":flag-pm:",
    code: "&#127477;&#127474;",
    category: "f",
    emoji_order: "2372",
    char: "🇵🇲"
  },
  {
    name: "flag-pn",
    unicode: "1f1f5-1f1f3",
    shortname: ":flag-pn:",
    code: "&#127477;&#127475;",
    category: "f",
    emoji_order: "2373",
    char: "🇵🇳"
  },
  {
    name: "flag-pr",
    unicode: "1f1f5-1f1f7",
    shortname: ":flag-pr:",
    code: "&#127477;&#127479;",
    category: "f",
    emoji_order: "2374",
    char: "🇵🇷"
  },
  {
    name: "flag-ps",
    unicode: "1f1f5-1f1f8",
    shortname: ":flag-ps:",
    code: "&#127477;&#127480;",
    category: "f",
    emoji_order: "2375",
    char: "🇵🇸"
  },
  {
    name: "flag-pt",
    unicode: "1f1f5-1f1f9",
    shortname: ":flag-pt:",
    code: "&#127477;&#127481;",
    category: "f",
    emoji_order: "2376",
    char: "🇵🇹"
  },
  {
    name: "flag-pw",
    unicode: "1f1f5-1f1fc",
    shortname: ":flag-pw:",
    code: "&#127477;&#127484;",
    category: "f",
    emoji_order: "2377",
    char: "🇵🇼"
  },
  {
    name: "flag-py",
    unicode: "1f1f5-1f1fe",
    shortname: ":flag-py:",
    code: "&#127477;&#127486;",
    category: "f",
    emoji_order: "2378",
    char: "🇵🇾"
  },
  {
    name: "flag-qa",
    unicode: "1f1f6-1f1e6",
    shortname: ":flag-qa:",
    code: "&#127478;&#127462;",
    category: "f",
    emoji_order: "2379",
    char: "🇶🇦"
  },
  {
    name: "flag-re",
    unicode: "1f1f7-1f1ea",
    shortname: ":flag-re:",
    code: "&#127479;&#127466;",
    category: "f",
    emoji_order: "2380",
    char: "🇷🇪"
  },
  {
    name: "flag-ro",
    unicode: "1f1f7-1f1f4",
    shortname: ":flag-ro:",
    code: "&#127479;&#127476;",
    category: "f",
    emoji_order: "2381",
    char: "🇷🇴"
  },
  {
    name: "flag-rs",
    unicode: "1f1f7-1f1f8",
    shortname: ":flag-rs:",
    code: "&#127479;&#127480;",
    category: "f",
    emoji_order: "2382",
    char: "🇷🇸"
  },
  {
    name: "flag-ru",
    unicode: "1f1f7-1f1fa",
    shortname: ":flag-ru:",
    code: "&#127479;&#127482;",
    category: "f",
    emoji_order: "2383",
    char: "🇷🇺"
  },
  {
    name: "flag-rw",
    unicode: "1f1f7-1f1fc",
    shortname: ":flag-rw:",
    code: "&#127479;&#127484;",
    category: "f",
    emoji_order: "2384",
    char: "🇷🇼"
  },
  {
    name: "flag-sa",
    unicode: "1f1f8-1f1e6",
    shortname: ":flag-sa:",
    code: "&#127480;&#127462;",
    category: "f",
    emoji_order: "2385",
    char: "🇸🇦"
  },
  {
    name: "flag-sb",
    unicode: "1f1f8-1f1e7",
    shortname: ":flag-sb:",
    code: "&#127480;&#127463;",
    category: "f",
    emoji_order: "2386",
    char: "🇸🇧"
  },
  {
    name: "flag-sc",
    unicode: "1f1f8-1f1e8",
    shortname: ":flag-sc:",
    code: "&#127480;&#127464;",
    category: "f",
    emoji_order: "2387",
    char: "🇸🇨"
  },
  {
    name: "flag-sd",
    unicode: "1f1f8-1f1e9",
    shortname: ":flag-sd:",
    code: "&#127480;&#127465;",
    category: "f",
    emoji_order: "2388",
    char: "🇸🇩"
  },
  {
    name: "flag-se",
    unicode: "1f1f8-1f1ea",
    shortname: ":flag-se:",
    code: "&#127480;&#127466;",
    category: "f",
    emoji_order: "2389",
    char: "🇸🇪"
  },
  {
    name: "flag-sg",
    unicode: "1f1f8-1f1ec",
    shortname: ":flag-sg:",
    code: "&#127480;&#127468;",
    category: "f",
    emoji_order: "2390",
    char: "🇸🇬"
  },
  {
    name: "flag-sh",
    unicode: "1f1f8-1f1ed",
    shortname: ":flag-sh:",
    code: "&#127480;&#127469;",
    category: "f",
    emoji_order: "2391",
    char: "🇸🇭"
  },
  {
    name: "flag-si",
    unicode: "1f1f8-1f1ee",
    shortname: ":flag-si:",
    code: "&#127480;&#127470;",
    category: "f",
    emoji_order: "2392",
    char: "🇸🇮"
  },
  {
    name: "flag-sj",
    unicode: "1f1f8-1f1ef",
    shortname: ":flag-sj:",
    code: "&#127480;&#127471;",
    category: "f",
    emoji_order: "2393",
    char: "🇸🇯"
  },
  {
    name: "flag-sk",
    unicode: "1f1f8-1f1f0",
    shortname: ":flag-sk:",
    code: "&#127480;&#127472;",
    category: "f",
    emoji_order: "2394",
    char: "🇸🇰"
  },
  {
    name: "flag-sl",
    unicode: "1f1f8-1f1f1",
    shortname: ":flag-sl:",
    code: "&#127480;&#127473;",
    category: "f",
    emoji_order: "2395",
    char: "🇸🇱"
  },
  {
    name: "flag-sm",
    unicode: "1f1f8-1f1f2",
    shortname: ":flag-sm:",
    code: "&#127480;&#127474;",
    category: "f",
    emoji_order: "2396",
    char: "🇸🇲"
  },
  {
    name: "flag-sn",
    unicode: "1f1f8-1f1f3",
    shortname: ":flag-sn:",
    code: "&#127480;&#127475;",
    category: "f",
    emoji_order: "2397",
    char: "🇸🇳"
  },
  {
    name: "flag-so",
    unicode: "1f1f8-1f1f4",
    shortname: ":flag-so:",
    code: "&#127480;&#127476;",
    category: "f",
    emoji_order: "2398",
    char: "🇸🇴"
  },
  {
    name: "flag-sr",
    unicode: "1f1f8-1f1f7",
    shortname: ":flag-sr:",
    code: "&#127480;&#127479;",
    category: "f",
    emoji_order: "2399",
    char: "🇸🇷"
  },
  {
    name: "flag-ss",
    unicode: "1f1f8-1f1f8",
    shortname: ":flag-ss:",
    code: "&#127480;&#127480;",
    category: "f",
    emoji_order: "2400",
    char: "🇸🇸"
  },
  {
    name: "flag-st",
    unicode: "1f1f8-1f1f9",
    shortname: ":flag-st:",
    code: "&#127480;&#127481;",
    category: "f",
    emoji_order: "2401",
    char: "🇸🇹"
  },
  {
    name: "flag-sv",
    unicode: "1f1f8-1f1fb",
    shortname: ":flag-sv:",
    code: "&#127480;&#127483;",
    category: "f",
    emoji_order: "2402",
    char: "🇸🇻"
  },
  {
    name: "flag-sx",
    unicode: "1f1f8-1f1fd",
    shortname: ":flag-sx:",
    code: "&#127480;&#127485;",
    category: "f",
    emoji_order: "2403",
    char: "🇸🇽"
  },
  {
    name: "flag-sy",
    unicode: "1f1f8-1f1fe",
    shortname: ":flag-sy:",
    code: "&#127480;&#127486;",
    category: "f",
    emoji_order: "2404",
    char: "🇸🇾"
  },
  {
    name: "flag-sz",
    unicode: "1f1f8-1f1ff",
    shortname: ":flag-sz:",
    code: "&#127480;&#127487;",
    category: "f",
    emoji_order: "2405",
    char: "🇸🇿"
  },
  {
    name: "flag-ta",
    unicode: "1f1f9-1f1e6",
    shortname: ":flag-ta:",
    code: "&#127481;&#127462;",
    category: "f",
    emoji_order: "2406",
    char: "🇹🇦"
  },
  {
    name: "flag-tc",
    unicode: "1f1f9-1f1e8",
    shortname: ":flag-tc:",
    code: "&#127481;&#127464;",
    category: "f",
    emoji_order: "2407",
    char: "🇹🇨"
  },
  {
    name: "flag-td",
    unicode: "1f1f9-1f1e9",
    shortname: ":flag-td:",
    code: "&#127481;&#127465;",
    category: "f",
    emoji_order: "2408",
    char: "🇹🇩"
  },
  {
    name: "flag-tf",
    unicode: "1f1f9-1f1eb",
    shortname: ":flag-tf:",
    code: "&#127481;&#127467;",
    category: "f",
    emoji_order: "2409",
    char: "🇹🇫"
  },
  {
    name: "flag-tg",
    unicode: "1f1f9-1f1ec",
    shortname: ":flag-tg:",
    code: "&#127481;&#127468;",
    category: "f",
    emoji_order: "2410",
    char: "🇹🇬"
  },
  {
    name: "flag-th",
    unicode: "1f1f9-1f1ed",
    shortname: ":flag-th:",
    code: "&#127481;&#127469;",
    category: "f",
    emoji_order: "2411",
    char: "🇹🇭"
  },
  {
    name: "flag-tj",
    unicode: "1f1f9-1f1ef",
    shortname: ":flag-tj:",
    code: "&#127481;&#127471;",
    category: "f",
    emoji_order: "2412",
    char: "🇹🇯"
  },
  {
    name: "flag-tk",
    unicode: "1f1f9-1f1f0",
    shortname: ":flag-tk:",
    code: "&#127481;&#127472;",
    category: "f",
    emoji_order: "2413",
    char: "🇹🇰"
  },
  {
    name: "flag-tl",
    unicode: "1f1f9-1f1f1",
    shortname: ":flag-tl:",
    code: "&#127481;&#127473;",
    category: "f",
    emoji_order: "2414",
    char: "🇹🇱"
  },
  {
    name: "flag-tm",
    unicode: "1f1f9-1f1f2",
    shortname: ":flag-tm:",
    code: "&#127481;&#127474;",
    category: "f",
    emoji_order: "2415",
    char: "🇹🇲"
  },
  {
    name: "flag-tn",
    unicode: "1f1f9-1f1f3",
    shortname: ":flag-tn:",
    code: "&#127481;&#127475;",
    category: "f",
    emoji_order: "2416",
    char: "🇹🇳"
  },
  {
    name: "flag-to",
    unicode: "1f1f9-1f1f4",
    shortname: ":flag-to:",
    code: "&#127481;&#127476;",
    category: "f",
    emoji_order: "2417",
    char: "🇹🇴"
  },
  {
    name: "flag-tr",
    unicode: "1f1f9-1f1f7",
    shortname: ":flag-tr:",
    code: "&#127481;&#127479;",
    category: "f",
    emoji_order: "2418",
    char: "🇹🇷"
  },
  {
    name: "flag-tt",
    unicode: "1f1f9-1f1f9",
    shortname: ":flag-tt:",
    code: "&#127481;&#127481;",
    category: "f",
    emoji_order: "2419",
    char: "🇹🇹"
  },
  {
    name: "flag-tv",
    unicode: "1f1f9-1f1fb",
    shortname: ":flag-tv:",
    code: "&#127481;&#127483;",
    category: "f",
    emoji_order: "2420",
    char: "🇹🇻"
  },
  {
    name: "flag-tw",
    unicode: "1f1f9-1f1fc",
    shortname: ":flag-tw:",
    code: "&#127481;&#127484;",
    category: "f",
    emoji_order: "2421",
    char: "🇹🇼"
  },
  {
    name: "flag-tz",
    unicode: "1f1f9-1f1ff",
    shortname: ":flag-tz:",
    code: "&#127481;&#127487;",
    category: "f",
    emoji_order: "2422",
    char: "🇹🇿"
  },
  {
    name: "flag-ua",
    unicode: "1f1fa-1f1e6",
    shortname: ":flag-ua:",
    code: "&#127482;&#127462;",
    category: "f",
    emoji_order: "2423",
    char: "🇺🇦"
  },
  {
    name: "flag-ug",
    unicode: "1f1fa-1f1ec",
    shortname: ":flag-ug:",
    code: "&#127482;&#127468;",
    category: "f",
    emoji_order: "2424",
    char: "🇺🇬"
  },
  {
    name: "flag-um",
    unicode: "1f1fa-1f1f2",
    shortname: ":flag-um:",
    code: "&#127482;&#127474;",
    category: "f",
    emoji_order: "2425",
    char: "🇺🇲"
  },
  {
    name: "flag-us",
    unicode: "1f1fa-1f1f8",
    shortname: ":flag-us:",
    code: "&#127482;&#127480;",
    category: "f",
    emoji_order: "2427",
    char: "🇺🇸"
  },
  {
    name: "flag-uy",
    unicode: "1f1fa-1f1fe",
    shortname: ":flag-uy:",
    code: "&#127482;&#127486;",
    category: "f",
    emoji_order: "2428",
    char: "🇺🇾"
  },
  {
    name: "flag-uz",
    unicode: "1f1fa-1f1ff",
    shortname: ":flag-uz:",
    code: "&#127482;&#127487;",
    category: "f",
    emoji_order: "2429",
    char: "🇺🇿"
  },
  {
    name: "flag-va",
    unicode: "1f1fb-1f1e6",
    shortname: ":flag-va:",
    code: "&#127483;&#127462;",
    category: "f",
    emoji_order: "2430",
    char: "🇻🇦"
  },
  {
    name: "flag-vc",
    unicode: "1f1fb-1f1e8",
    shortname: ":flag-vc:",
    code: "&#127483;&#127464;",
    category: "f",
    emoji_order: "2431",
    char: "🇻🇨"
  },
  {
    name: "flag-ve",
    unicode: "1f1fb-1f1ea",
    shortname: ":flag-ve:",
    code: "&#127483;&#127466;",
    category: "f",
    emoji_order: "2432",
    char: "🇻🇪"
  },
  {
    name: "flag-vg",
    unicode: "1f1fb-1f1ec",
    shortname: ":flag-vg:",
    code: "&#127483;&#127468;",
    category: "f",
    emoji_order: "2433",
    char: "🇻🇬"
  },
  {
    name: "flag-vi",
    unicode: "1f1fb-1f1ee",
    shortname: ":flag-vi:",
    code: "&#127483;&#127470;",
    category: "f",
    emoji_order: "2434",
    char: "🇻🇮"
  },
  {
    name: "flag-vn",
    unicode: "1f1fb-1f1f3",
    shortname: ":flag-vn:",
    code: "&#127483;&#127475;",
    category: "f",
    emoji_order: "2435",
    char: "🇻🇳"
  },
  {
    name: "flag-vu",
    unicode: "1f1fb-1f1fa",
    shortname: ":flag_vu:",
    code: "&#127483;&#127482;",
    category: "f",
    emoji_order: "2436",
    char: "🇻🇺"
  },
  {
    name: "flag-wf",
    unicode: "1f1fc-1f1eb",
    shortname: ":flag_wf:",
    code: "&#127484;&#127467;",
    category: "f",
    emoji_order: "2437",
    char: "🇼🇫"
  },
  {
    name: "flag-ws",
    unicode: "1f1fc-1f1f8",
    shortname: ":flag_ws:",
    code: "&#127484;&#127480;",
    category: "f",
    emoji_order: "2438",
    char: "🇼🇸"
  },
  {
    name: "flag-xk",
    unicode: "1f1fd-1f1f0",
    shortname: ":flag_xk:",
    code: "&#127485;&#127472;",
    category: "f",
    emoji_order: "2439",
    char: "🇽🇰"
  },
  {
    name: "flag-ye",
    unicode: "1f1fe-1f1ea",
    shortname: ":flag_ye:",
    code: "&#127486;&#127466;",
    category: "f",
    emoji_order: "2440",
    char: "🇾🇪"
  },
  {
    name: "flag-yt",
    unicode: "1f1fe-1f1f9",
    shortname: ":flag_yt:",
    code: "&#127486;&#127481;",
    category: "f",
    emoji_order: "2441",
    char: "🇾🇹"
  },
  {
    name: "flag-za",
    unicode: "1f1ff-1f1e6",
    shortname: ":flag_za:",
    code: "&#127487;&#127462;",
    category: "f",
    emoji_order: "2442",
    char: "🇿🇦"
  },
  {
    name: "flag-zm",
    unicode: "1f1ff-1f1f2",
    shortname: ":flag_zm:",
    code: "&#127487;&#127474;",
    category: "f",
    emoji_order: "2443",
    char: "🇿🇲"
  },
  {
    name: "flag-zw",
    unicode: "1f1ff-1f1fc",
    shortname: ":flag_zw:",
    code: "&#127487;&#127484;",
    category: "f",
    emoji_order: "2444",
    char: "🇿🇼"
  },
  {
    name: "speech",
    unicode: "1f600",
    shortname: ":speech:",
    code: "&#128172;",
    category: "p",
    emoji_order: "1",
    char: "💬"
  }
];

export const EmojiToShortname = new Map();

for (const entry of EmojiList) {
  EmojiToShortname.set(entry.char, entry.shortname.substring(1, entry.shortname.length - 1));
}

const emojiSvgs = new Map();

export const loadEmojis = async () => {
  const blob = await (await fetch(EmojiTar)).blob();
  const buf = await blob.arrayBuffer();
  const files = await untar(buf);
  for (const { name, buffer } of files) {
    emojiSvgs.set(name, buffer);
  }
};

export const getBlobForEmojiImage = unicode => {
  const buf = emojiSvgs.get(`${unicode}.svg`);

  if (!buf) {
    console.log("failed for", unicode);
    return null;
  }

  return new Blob([buf], { type: "image/svg+xml" });
};
