package com.design.platform.asset.dto;

public class AssetQuery {

    private String scope = "mine";
    private Long teamId;
    private String fileType;
    private String keyword;
    private String category;
    private int page = 1;
    private int size = 12;

    public String getScope() {
        return scope == null || scope.isBlank() ? "mine" : scope;
    }

    public void setScope(String scope) {
        this.scope = scope;
    }

    public Long getTeamId() {
        return teamId;
    }

    public void setTeamId(Long teamId) {
        this.teamId = teamId;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
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
