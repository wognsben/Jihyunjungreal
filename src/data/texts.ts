export type Category = 'All' | 'Article' | 'Note' | 'Review';

export interface TextItem {
  id: string;
  year: string;
  category: Category;
  author: {
    en: string;
    ko: string;
    jp: string;
  };
  title: {
    en: string;
    ko: string;
    jp: string;
  };
  link: string;
  image: string;
  summary?: {
    en: string;
    ko: string;
    jp: string;
  };
  content?: {
    en: string;
    ko: string;
    jp: string;
  };
  contentHtml?: {
    en?: string;
    ko?: string;
    jp?: string;
  };
  relatedWorks?: {
    id: string;
    title: string;
    thumbnail: string;
    year: string;
    medium: string;
  }[];
  hasEn?: boolean;
  hasJp?: boolean;
  hasKo?: boolean;
}

export const textData: TextItem[] = [
  { 
    id: 'a1', year: '2024', category: 'Article', 
    author: { en: 'Brian Isett', ko: '브라이언 아이셋', jp: 'Brian Isett' },
    title: { en: 'Theia', ko: '테이아', jp: 'テイア' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/14.jpg',
    summary: {
      en: "Pondering the age-old question his young daughter will inevitably ask—Where did the Moon come from?—biologist Brian Isett uncovers the story of how the Earth got Her seasonal song.",
      ko: "생물학자 브라이언 아이셋이 딸아이가 언젠가 물어볼 오래된 질문, '달은 어디서 왔을까?'를 고민하며 지구가 어떻게 계절의 노래를 갖게 되었는지에 대한 이야기를 들려줍니다.",
      jp: "生物学者のブライアン・アイセットが、幼い娘がいずれ尋ねるであろう「月はどこから来たのか？」という古くからの問いに思いを馳せながら、地球がどのようにして季節の歌を持つようになったのかという物語を紐해킵니다。"
    }
  },
  { 
    id: 'a2', year: '2024', category: 'Article', 
    author: { en: 'Terry Tempest Williams', ko: '테리 템페스트 윌리엄스', jp: 'Terry Tempest Williams' },
    title: { en: 'A Hollow Bone', ko: '빈 뼈', jp: '空洞の骨' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/20.jpg',
    summary: {
      en: "Terry Tempest Williams reflects on the sacred nature of hollow spaces and the resonance they hold within the landscape of memory.",
      ko: "테리 템페스트 윌리엄스가 텅 빈 공간의 신성함과 기억의 풍경 속에서 그것이 갖는 울림에 대해 성찰합니다.",
      jp: "テリー・テンペスト・ウィリアムズが、空洞の神聖な性질と、それが記憶の風景の中で持つ共鳴について考察します。"
    }
  },
  { 
    id: 'a3', year: '2024', category: 'Article', 
    author: { en: 'Ben Goldfarb', ko: '벤 골드파브', jp: 'Ben Goldfarb' },
    title: { en: 'A River Reborn', ko: '다시 태어난 강', jp: '生まれ変わった川' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/11.jpg',
    summary: {
      en: "Investigating the restoration of ancient waterways and how they reshape not only the land but the communities that depend on them.",
      ko: "고대 수로의 복원과 그것이 땅뿐만 아니라 그에 의존하는 공동체를 어떻게 재편하는지 조사합니다.",
      jp: "古代の水路の修復と、それが土地だけでなく、それに依存するコミュニティをどのように再形成するかを調査します。"
    }
  },
  { 
    id: 'post-1585', year: '2024', category: 'Article', 
    author: { en: 'Hyejin Mun', ko: '문혜진', jp: 'Hyejin Mun' },
    title: { en: 'Poking the Side of Sculpture', ko: '조각의 옆구리를 슬쩍 찌르기 : 있는 듯 없는 듯 부지런한 정지현의 사물들', jp: '조각의 옆구리를 슬쩍 찌르기' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/1.jpg',
    summary: {
      en: "Biologist Brian Isett uncovers the story of how the Earth got Her seasonal song, pondering the age-old question his young daughter will inevitably ask—Where did the Moon come from?",
      ko: "생물학자 브라이언 아이셋이 딸아이가 언젠가 물어볼 오래된 질문, '달은 어디서 왔을까?'를 고민하며 지구가 어떻게 계절의 노래를 갖게 되었는지에 대한 이야기를 들려줍니다.",
      jp: "生物学者のブライ언・アイ셋が、幼い娘がいずれ尋ねるであろう「月はどこから来たのか？」という古くからの問いに思い를馳せながら、地球がどのようにして季節の歌を持つようになったのかという物語を紐해킵니다。"
    }
  },
  { 
    id: 'post-1587', year: '2024', category: 'Article', 
    author: { en: 'Soyeon Ahn', ko: '안소연', jp: 'Soyeon Ahn' },
    title: { en: '〈Hang-Dog〉 The Bird on the Roof Outside', ko: '〈행도그〉 저 창문 밖 지붕 위의 새', jp: '〈Hang-Dog〉 窓の外の屋根の上の鳥' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/10.jpg',
    summary: {
      en: "Terry Tempest Williams reflects on the sacred nature of hollow spaces and the resonance they hold within the landscape of memory.",
      ko: "테리 템페스트 윌리엄스가 텅 빈 공간의 신성함과 기억의 풍경 속에서 그것이 갖는 울림에 대해 성찰합니다.",
      jp: "テリー・テンペ스트・ウィリアムズが、空洞の神聖な性질と、それが記憶の風景の中で持つ共鳴について考察します。"
    }
  },
  { 
    id: 'post-1429', year: '2023', category: 'Article', 
    author: { en: 'Hanbum Lee', ko: '이한범', jp: 'Hanbum Lee' },
    title: { en: '〈Gouge〉 / Sculpture Gone Far', ko: '〈가우지〉 / 멀리가는 조각', jp: '〈Gouge〉 / 遠くへ行く彫刻' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/11.jpg',
    summary: {
      en: "Investigating the restoration of ancient waterways and how they reshape not only the land but the communities that depend on them.",
      ko: "고대 수로의 복원과 그것이 땅뿐만 아니라 그에 의존하는 공동체를 어떻게 재편하는지 조사합니다.",
      jp: "古代の水路の修復と、それが土地だけでなく、それに依존するコミュニティをどのように再形成するかを調査します。"
    }
  },
  { 
    id: 'post-1410', year: '2022', category: 'Article', 
    author: { en: 'Wonhwa Yoon', ko: '윤원화', jp: 'Wonhwa Yoon' },
    title: { en: '〈Gouge〉 / Invisible Sculpture', ko: '〈가우지〉 / 보이지 않는 조각', jp: '〈Gouge〉 / 見えない彫刻' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/12.jpg'
  },
  { 
    id: 'post-1220', year: '2021', category: 'Article', 
    author: { en: 'Hanbum Lee', ko: '이한범', jp: 'Hanbum Lee' },
    title: { en: 'Unapproachable Land & Person with a Bag', ko: '갈 수 없는 땅 & 가방을 든 사람', jp: '行けない土地 & 鞄を持った人' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/13.jpg'
  },
  { 
    id: 'post-1191', year: '2021', category: 'Article', 
    author: { en: 'Jeongwon Ye', ko: '예정원', jp: 'Jeongwon Ye' },
    title: { en: 'Alley Play of Loose Community 〈Room Adventure_with VR〉', ko: '느슨한 공동체의 골목놀이 〈방구석 대모험_VR끼고〉', jp: '緩やかな共同体の路地遊び' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/14.jpg'
  },
  { 
    id: 'post-947', year: '2019', category: 'Article', 
    author: { en: 'Yuki Konno', ko: '콘노 유키', jp: 'Yuki Konno' },
    title: { en: '〈Multipurpose Henry〉 / Plus Plus Minus', ko: '〈다목적 헨리〉 / 더하기 더하기 빼기', jp: '〈Multipurpose Henry〉 / 足す足す引く' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/15.jpg'
  },
  { 
    id: 'post-840', year: '2019', category: 'Article', 
    author: { en: 'Yunkyoung Kim', ko: '김윤경', jp: 'Yunkyoung Kim' },
    title: { en: '〈Multipurpose Henry〉 / Is this world worthy to be destroyed?', ko: '〈다목적 헨리〉 / 이 세상은 파괴할 만한 가치가 있을까?', jp: '〈Multipurpose Henry〉 / この世界は破壊される価値があるか？' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/16.jpg'
  },
  { 
    id: 'post-822', year: '2019', category: 'Article', 
    author: { en: 'Hyokyoung Jeon', ko: '전효경', jp: 'Hyokyoung Jeon' },
    title: { en: "Jihyun Jung: Practice of 'Making'", ko: "정지현: ‘만들기’의 실천", jp: "Jihyun Jung: ‘作る’の実践" }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/17.jpg'
  },
  { 
    id: 'post-931', year: '2019', category: 'Review', 
    author: { en: 'Hanbum Lee', ko: '이한범', jp: 'Hanbum Lee' },
    title: { en: '〈Once a Day〉 / A Stage Contemplating the World of Objects', ko: '〈하루 한 번〉 / 사물의 세계를 사유하는 무대', jp: '〈一日一回〉 / 物の世界を思惟する舞台' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/18.jpg'
  },
  { 
    id: 'post-933', year: '2018', category: 'Note', 
    author: { en: 'Table Talk', ko: '테이블 토크', jp: 'Table Talk' },   
    title: { en: '〈Once a Day〉 / Story of Three', ko: '〈하루 한 번〉 / 셋의 이야기', jp: '〈一日一回〉 / 三つの話' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/19.jpg'
  },
  { 
    id: 'post-636', year: '2017', category: 'Review', 
    author: { en: 'Haeju Kim', ko: '김해주', jp: 'Haeju Kim' },
    title: { en: '〈Dawn Breaks, Seoul〉 / Time of Adventure', ko: '〈도운브레익스,서울〉 / 모험의 시간', jp: '〈Dawn Breaks, Seoul〉 / 冒険の時間' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/2.jpg'
  },
  { 
    id: 'post-662', year: '2016', category: 'Review', 
    author: { en: 'Jee Young Maeng', ko: '맹지영', jp: 'Jee Young Maeng' },
    title: { en: '〈Gomyomsom〉 / Resisting Signification', ko: '〈곰염섬〉 / 의미화를 거스르기', jp: '〈Gomyomsom〉 / 意味化に逆らう' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/20.jpg'
  },
  { 
    id: 'post-604', year: '2016', category: 'Review', 
    author: { en: 'Hanbum Lee', ko: '이한범', jp: 'Hanbum Lee' },
    title: { en: '〈Gomyomsom〉 / I Would Choose Not To', ko: '〈곰염섬〉 / 안 하는 편을 택하겠습니다', jp: '〈Gomyomsom〉 / しない方を選びます' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/21.jpg'
  },
  { 
    id: 'post-606', year: '2016', category: 'Review', 
    author: { en: 'Anonymous', ko: 'Anonymous', jp: 'Anonymous' },
    title: { en: '〈Gomyomsom〉 / Walking Between Shaking and Overlapping Framing', ko: '〈곰염섬〉 / 흔들리고 중첩되는 프레이밍 사이에서 거닐기', jp: '〈Gomyomsom〉 / 揺れて重なるフレーミングの間を歩く' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/22.jpg'
  },
  { 
    id: 'post-611', year: '2016', category: 'Review', 
    author: { en: 'Kyunghwan Yeo', ko: '여경환', jp: 'Kyunghwan Yeo' },
    title: { en: '〈Gomyomsom〉', ko: '〈곰염섬〉', jp: '〈Gomyomsom〉' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/23.jpg'
  },
  { 
    id: 'post-608', year: '2016', category: 'Review', 
    author: { en: 'Bbyabbya Kim', ko: '김.jpaRepository', jp: 'Bbyabbya Kim' },
    title: { en: 'Thinking of ◼︎◼︎◼︎ Repeatedly', ko: '◼︎◼︎◼︎을 자꾸 생각하기', jp: '◼︎◼︎◼︎を何度も考える' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/24.jpg'
  },
  { 
    id: 'post-520', year: '2016', category: 'Note', 
    author: { en: 'Junghyun Kim', ko: '김정현', jp: 'Junghyun Kim' },
    title: { en: 'Memo or Before Words', ko: '메모 또는 낱말 이전', jp: 'メモまたは言葉以前' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/25.jpg'
  },
  { 
    id: 'post-501', year: '2014', category: 'Note', 
    author: { en: 'Jee Young Maeng', ko: '맹지영', jp: 'Jee Young Maeng' },   
    title: { en: 'Story about Conversation', ko: '대화에 관한 이야기: 반복적 혹은 분절된 대화', jp: '会話についての物語' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/3.jpg'
  },
  { 
    id: 'post-342', year: '2014', category: 'Review', 
    author: { en: 'Jee Young Maeng', ko: '맹지영', jp: 'Jee Young Maeng' },
    title: { en: 'Using The Ear In Order To Hear', ko: '듣기 위해 귀를 사용한 일', jp: '聞くために耳を使ったこと' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/4.jpg'
  },
  { 
    id: 'post-341', year: '2013', category: 'Review', 
    author: { en: 'Sujin Park', ko: '박수진', jp: 'Sujin Park' },
    title: { en: 'Bird Eat Bird', ko: 'Bird Eat Bird', jp: 'Bird Eat Bird' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/5.jpg'
  },
  { 
    id: 'post-340', year: '2013', category: 'Review', 
    author: { en: 'Areum Woo', ko: '우아름', jp: 'Areum Woo' },
    title: { en: 'Bird Eat Bird', ko: 'Bird Eat Bird', jp: 'Bird Eat Bird' }, 
    link: '#/text',
    image: 'https://raw.githubusercontent.com/wognsben/gallery/main/6.jpg'
  },
];