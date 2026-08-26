import { Button, Modal, Spin, Tag } from "antd";
import { StarFilled, StarOutlined } from "@ant-design/icons";
import TemplateCover from "./TemplateCover.jsx";

function formatTime(value) {
  if (!value) return "暂无";
  return String(value).replace("T", " ").slice(0, 16);
}

export default function TemplateDetailModal({
  open,
  template,
  loading = false,
  using = false,
  favorited = false,
  favoriteLoading = false,
  onClose,
  onUse,
  onToggleFavorite,
  extra,
}) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnHidden
      className="template-detail-modal"
      title={null}
    >
      <Spin spinning={loading}>
        {template ? (
          <div className="template-detail">
            <div className="template-detail-cover">
              <TemplateCover template={template} />
            </div>
            <div className="template-detail-info">
              <div className="template-detail-badges">
                <Tag color={template.isPublic === false ? "default" : "blue"}>
                  {template.isPublic === false ? "私有" : "公开"}
                </Tag>
                {template.category ? <Tag>{template.category}</Tag> : null}
              </div>
              <h2 className="template-detail-title">{template.title}</h2>
              <p className="template-detail-author">
                作者：{template.authorNickname || "一稿"}
              </p>
              <div className="template-detail-tags">
                {(template.tags || []).map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
              <dl className="template-detail-meta">
                <div>
                  <dt>浏览</dt>
                  <dd>{template.viewCount ?? 0}</dd>
                </div>
                <div>
                  <dt>使用</dt>
                  <dd>{template.downloadCount ?? 0}</dd>
                </div>
                <div>
                  <dt>创建时间</dt>
                  <dd>{formatTime(template.createdAt)}</dd>
                </div>
                <div>
                  <dt>更新时间</dt>
                  <dd>{formatTime(template.updatedAt)}</dd>
                </div>
              </dl>
              <div className="template-detail-actions">
                {extra}
                {onToggleFavorite ? (
                  <Button
                    className={favorited ? "is-favorited" : ""}
                    icon={favorited ? <StarFilled /> : <StarOutlined />}
                    loading={favoriteLoading}
                    onClick={onToggleFavorite}
                  >
                    {favorited ? "已收藏" : "收藏"}
                  </Button>
                ) : null}
                <Button type="primary" loading={using} onClick={onUse}>
                  使用模板
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Spin>
    </Modal>
  );
}
