import {fetchReticulumAuthenticated} from "./phoenix-utils";

export default class MediaTree extends EventTarget {
  constructor(source) {
    super();

    this.treeData = [];
    this.metasForCategoryKey = new Map();
    this.data = null;
    this.source = source;
    this.idKey = source === "world_templates" ? "world_template_id" : "vox_id";
  }

  getMetasForTreeKey(key) {
    return this.metasForCategoryKey.get(key) || [];
  }

  async build(data = null) {
    const { treeData, metasForCategoryKey, source, idKey } = this;

    if (data === null) {
      data = (await fetchReticulumAuthenticated(`/api/v1/media/search?source=${source}&filter=featured`)).entries;
    }

    this.data = data;
    this.treeData.length = 0;

    for (const entry of this.data) {
      const { url, name, thumb_url, preview_url, collection, category } = entry;

      const id = entry[idKey];

      let collectionNode = treeData.find(({ key }) => key === collection);

      if (!collectionNode) {
        collectionNode = {
          key: collection,
          title: collection,
          children: [],
          isLeaf: this.source === "world_templates"
        };
        treeData.push(collectionNode);
      }

      let categoryKey;

      if (this.source === "vox") {
        categoryKey = `${collection}__${category}`;
        let categoryNode = collectionNode.children.find(({ key }) => key === categoryKey);

        if (!categoryNode) {
          categoryNode = { key: categoryKey, title: category, children: [], isLeaf: true };
          collectionNode.children.push(categoryNode);
        }
      } else {
        categoryKey = collection;
      }

      let metas = metasForCategoryKey.get(categoryKey);
      if (!metas) {
        metas = [];
        metasForCategoryKey.set(categoryKey, metas);
      }

      metas.push({
        [idKey]: id,
        url,
        thumb_url,
        preview_url,
        name: name || "Unnamed Object"
      });
    }

    const comparer = (x, y) => (x.title < y.title ? -1 : 1);
    treeData.sort(comparer);

    for (const { children: categories } of treeData) {
      categories.sort(comparer);
    }

    for (const metas of metasForCategoryKey.values()) {
      metas.sort(comparer);
    }

    this.dispatchEvent(new CustomEvent("treedata_updated"));
  }
}
