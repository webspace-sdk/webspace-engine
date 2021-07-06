import { fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";

export default class PublishedVoxTree extends EventTarget {
  constructor() {
    super();

    this.filteredTreeData = [];
    this.voxMetasForCategoryKey = new Map();
    this.voxData = null;
  }

  getVoxMetasForTreeKey(key) {
    return this.voxMetasForCategoryKey.get(key) || [];
  }

  async build(voxData = null) {
    const { filteredTreeData, voxMetasForCategoryKey } = this;

    if (voxData === null) {
      voxData = (await fetchReticulumAuthenticated("/api/v1/media/search?source=vox&filter=featured")).entries;
    }

    this.voxData = voxData;
    this.filteredTreeData.length = 0;

    for (const { vox_id, url, name, thumb_url, preview_url, collection, category } of this.voxData) {
      let collectionNode = filteredTreeData.find(({ key }) => key === collection);

      if (!collectionNode) {
        collectionNode = { key: collection, title: collection, children: [], isLeaf: false };
        filteredTreeData.push(collectionNode);
      }

      const categoryKey = `${collection}__${category}`;
      let categoryNode = collectionNode.children.find(({ key }) => key === categoryKey);

      if (!categoryNode) {
        categoryNode = { key: categoryKey, title: category, children: [], isLeaf: true };
        collectionNode.children.push(categoryNode);
      }

      let vox = voxMetasForCategoryKey.get(categoryKey);
      if (!vox) {
        vox = [];
        voxMetasForCategoryKey.set(categoryKey, vox);
      }

      vox.push({
        voxId: vox_id,
        url,
        thumb_url,
        preview_url,
        name: name || "Unnamed Object"
      });
    }

    const comparer = (x, y) => (x.title < y.title ? -1 : 1);
    filteredTreeData.sort(comparer);

    for (const { children: categories } of filteredTreeData) {
      categories.sort(comparer);
    }

    for (const voxMetas of voxMetasForCategoryKey.values()) {
      voxMetas.sort(comparer);
    }

    this.dispatchEvent(new CustomEvent("filtered_treedata_updated"));
  }
}
