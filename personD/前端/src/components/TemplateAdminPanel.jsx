import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App as AntdApp, Button, Input, Modal, Select, Spin, Switch, Tag } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PictureOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  createTemplate,
  createWorkFromTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
  uploadTemplateCover,
} from "../api/templates.js";
import { TEMPLATE_CATEGORIES } from "../config/templateCategories.js";
import { createEmptyCanvas, stringifyCanvas } from "../canvas.js";
import TemplateCover from "./TemplateCover.jsx";
import TemplateDetailModal from "./TemplateDetailModal.jsx";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";
const DEFAULT_CANVAS = stringifyCanvas(createEmptyCanvas(1080, 1440));

function asRecords(data) {
  if (Array.isArray(data)) return data;
  return data?.records || [];
}

function splitTags(value) {
  return String(value || "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const CATEGORY_OPTIONS = TEMPLATE_CATEGORIES.filter((item) => item.apiCategory).map(
  (item) => ({ value: item.apiCategory, label: item.label }),
);

function emptyForm() {
  return {
    title: "",
    category: "主题海报",
    tags: "",
    isPublic: true,
    jsonData: DEFAULT_CANVAS,
  };
}

function formFromTemplate(template) {
  return {
    title: template.title || "",
    category: template.category || "主题海报",
    tags: (template.tags || []).join("，"),
    isPublic: template.isPublic !== false,
    jsonData: template.jsonData || DEFAULT_CANVAS,
  };
}

export default function TemplateAdminPanel() {
  const { message, modal } = AntdApp.useApp();
  const navigate = useNavigate();
  const rowCoverRef = useRef(null);
  const modalCoverRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [coverTargetId, setCoverTargetId] = useState(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState(null);
  const [usingId, setUsingId] = useState(null);

  const refreshTemplates = useCallback(async () => {
    try {
      const data = await listTemplates({ page: 1, size: 50 });
      setTemplates(asRecords(data));
    } catch (err) {
      message.error(err.message || "加载模板失败");
    }
  }, [message]);

  useEffect(() => {
    let cancelled = false;
    listTemplates({ page: 1, size: 50 })
      .then((data) => {
        if (!cancelled) setTemplates(asRecords(data));
      })
      .catch((err) => {
        if (!cancelled) message.error(err.message || "加载模板失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [message]);

  const handleModalCoverChange = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : "");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setCoverFile(null);
    setCoverPreview("");
    setModalOpen(true);
  };

  const openEdit = (template) => {
    setEditing(template);
    setForm(formFromTemplate(template));
    setCoverFile(null);
    setCoverPreview("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setCoverFile(null);
    setCoverPreview("");
  };

  const saveTemplate = async () => {
    if (!form.title.trim()) {
      message.warning("请输入模板名称");
      return;
    }
    if (!form.category) {
      message.warning("请选择模板分类");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        tags: splitTags(form.tags),
        isPublic: form.isPublic,
        jsonData: form.jsonData || DEFAULT_CANVAS,
      };
      let saved = editing
        ? await updateTemplate(editing.id, payload)
        : await createTemplate(payload);
      if (coverFile) {
        saved = await uploadTemplateCover(saved.id, coverFile);
      }
      setModalOpen(false);
      setCoverFile(null);
      await refreshTemplates();
      message.success(editing ? "模板已更新" : "模板已创建");
      setCoverPreview("");
      setDetailTemplate(saved);
      setDetailOpen(true);
    } catch (err) {
      message.error(err.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (template) => {
    modal.confirm({
      title: `删除模板「${template.title}」`,
      content: "删除后不可恢复，确定要删除吗？",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await deleteTemplate(template.id);
        await refreshTemplates();
        if (detailTemplate?.id === template.id) {
          setDetailOpen(false);
          setDetailTemplate(null);
        }
        message.success("模板已删除");
      },
    });
  };

  const handleRowCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !coverTargetId) return;
    setCoverUploading(true);
    try {
      const updated = await uploadTemplateCover(coverTargetId, file);
      setTemplates((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      if (detailTemplate?.id === updated.id) setDetailTemplate(updated);
      message.success("模板封面已更新");
    } catch (err) {
      message.error(err.message || "封面上传失败");
    } finally {
      setCoverUploading(false);
      setCoverTargetId(null);
    }
  };

  const handleUse = async (template) => {
    if (!template) return;
    setUsingId(template.id);
    try {
      const work = await createWorkFromTemplate(template.id);
      message.success(`已创建作品「${work.title}」`);
      setDetailOpen(false);
      navigate(`/works/${work.id}`);
    } catch (err) {
      message.error(err.message || "创建作品失败");
    } finally {
      setUsingId(null);
    }
  };

  const coverPreviewUrl = useMemo(
    () => coverPreview || editing?.coverImageUrl || detailTemplate?.coverImageUrl || "",
    [coverPreview, editing, detailTemplate],
  );

  return (
    <div className="template-admin">
      <div className="template-admin-head">
        <div className="template-admin-head-copy">
          <h2>模板管理</h2>
          <span>{templates.length} 个模板</span>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建模板
        </Button>
      </div>

      <Spin spinning={loading}>
        {templates.length === 0 && !loading ? (
          <div className="template-admin-empty">暂无模板</div>
        ) : (
          <div className="template-admin-grid">
            {templates.map((template) => (
              <article className="template-admin-card" key={template.id}>
                <div className="template-admin-cover">
                  <TemplateCover template={template} />
                  <div className="template-admin-cover-mask">
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => {
                        setDetailTemplate(template);
                        setDetailOpen(true);
                      }}
                    >
                      详情
                    </Button>
                  </div>
                </div>
                <div className="template-admin-meta">
                  <strong>{template.title}</strong>
                  <span>
                    {template.category || "未分类"} ·{" "}
                    {template.isPublic === false ? "私有" : "公开"}
                  </span>
                  <div className="template-admin-tags">
                    {(template.tags || []).slice(0, 2).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                  <div className="template-admin-stats">
                    <span>浏览 {template.viewCount ?? 0}</span>
                    <span>使用 {template.downloadCount ?? 0}</span>
                  </div>
                  <div className="template-admin-actions">
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(template)}
                    >
                      编辑
                    </Button>
                    <Button
                      size="small"
                      icon={<PictureOutlined />}
                      loading={coverUploading && coverTargetId === template.id}
                      onClick={() => {
                        setCoverTargetId(template.id);
                        rowCoverRef.current?.click();
                      }}
                    >
                      封面
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(template)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Spin>

      <input
        ref={rowCoverRef}
        className="template-admin-file"
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={handleRowCover}
      />

      <Modal
        title={editing ? "编辑模板" : "新建模板"}
        open={modalOpen}
        onCancel={closeModal}
        onOk={saveTemplate}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <div className="template-admin-form">
          <label className="template-admin-field">
            <span>模板名称</span>
            <Input
              value={form.title}
              maxLength={128}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </label>
          <label className="template-admin-field">
            <span>模板分类</span>
            <Select
              value={form.category}
              options={CATEGORY_OPTIONS}
              onChange={(category) =>
                setForm((prev) => ({ ...prev, category }))
              }
            />
          </label>
          <label className="template-admin-field">
            <span>标签</span>
            <Input
              value={form.tags}
              placeholder="用逗号分隔"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tags: event.target.value }))
              }
            />
          </label>
          <div className="template-admin-switch-row">
            <span>公开模板</span>
            <Switch
              checked={form.isPublic}
              onChange={(isPublic) =>
                setForm((prev) => ({ ...prev, isPublic }))
              }
            />
          </div>
          <div className="template-admin-field">
            <span>模板封面</span>
            <div className="template-admin-cover-pick">
              {coverPreviewUrl ? (
                <img src={coverPreviewUrl} alt="" />
              ) : (
                <span className="template-admin-cover-placeholder">
                  <PictureOutlined />
                </span>
              )}
              <div>
                <input
                  ref={modalCoverRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  onChange={handleModalCoverChange}
                />
                <Button
                  icon={<PictureOutlined />}
                  onClick={() => modalCoverRef.current?.click()}
                >
                  选择图片
                </Button>
                {coverFile ? (
                  <Button
                    size="small"
                    onClick={() => setCoverFile(null)}
                  >
                    移除
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <TemplateDetailModal
        open={detailOpen}
        template={detailTemplate}
        using={usingId === detailTemplate?.id}
        onClose={() => setDetailOpen(false)}
        onUse={() => handleUse(detailTemplate)}
        extra={
          detailTemplate ? (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  setDetailOpen(false);
                  openEdit(detailTemplate);
                }}
              >
                编辑
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  setDetailOpen(false);
                  handleDelete(detailTemplate);
                }}
              >
                删除
              </Button>
            </>
          ) : null
        }
      />
    </div>
  );
}
