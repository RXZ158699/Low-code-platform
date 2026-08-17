package com.design.platform.template.dto;

public class TemplateQuery {

    private String category;
    private String keyword;
    private String tag;
    private int page = 1;
    private int size = 12;

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public int getPage() {
        return page < 1 ? 1 : page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getSize() {
        if (size < 1) {
            return 12;
        }
        return size > 50 ? 50 : size;
    }

    public void setSize(int size) {
        this.size = size;
    }
}
