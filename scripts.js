document.addEventListener('DOMContentLoaded', async () => {
  const catalogRoot = document.getElementById('catalogRoot');
  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const copyTextToClipboard = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  };

  const renderVariant = (variant) => {
    const card = document.createElement('div');
    card.className = 'variant-card';
    card.id = `lock-${variant.model}`;
    card.dataset.support = JSON.stringify(variant.support || {});
    card.dataset.replacements = JSON.stringify(variant.replacementGroups || []);

    const info = document.createElement('div');
    info.className = 'variant-info';
    info.innerHTML = `<strong>${escapeHtml(variant.model || '')}</strong><span>${escapeHtml(variant.description || '')}</span>`;
    card.appendChild(info);

    if (variant.image) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder-image';
      const image = document.createElement('img');
      image.src = variant.image;
      image.alt = variant.model;
      placeholder.appendChild(image);
      card.appendChild(placeholder);
    }

    if (variant.manual) {
      const actions = document.createElement('div');
      actions.className = 'variant-actions';

      const link = document.createElement('a');
      link.className = 'variant-link';
      link.href = variant.manual;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Ver manual';

      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.className = 'variant-copy-link';
      copyButton.setAttribute('aria-label', `Copy manual link for ${variant.model || 'lock'}`);
      copyButton.title = 'Copy manual link';

      const copyIcon = document.createElement('img');
      copyIcon.src = 'Images/copy.png';
      copyIcon.alt = 'Copy manual link';
      copyIcon.width = 14;
      copyIcon.height = 14;
      copyButton.appendChild(copyIcon);

      copyButton.addEventListener('click', async () => {
        try {
          await copyTextToClipboard(link.href);
          copyButton.classList.add('copied');
          copyButton.title = 'Copied';
          window.clearTimeout(copyButton._copyResetTimer);
          copyButton._copyResetTimer = window.setTimeout(() => {
            copyButton.classList.remove('copied');
            copyButton.title = 'Copy manual link';
          }, 1200);
        } catch (error) {
          copyButton.title = 'Copy failed';
          window.clearTimeout(copyButton._copyResetTimer);
          copyButton._copyResetTimer = window.setTimeout(() => {
            copyButton.title = 'Copy manual link';
          }, 1200);
        }
      });

      actions.appendChild(link);
      actions.appendChild(copyButton);
      card.appendChild(actions);
    }

    return card;
  };

  const renderChildren = (children, container) => {
    const hasSubmenus = children.some((child) => child.type === 'submenu');

    if (!hasSubmenus) {
      const grid = document.createElement('div');
      grid.className = 'variant-grid';
      children.forEach((child) => {
        if (child.type === 'variant') {
          grid.appendChild(renderVariant(child));
        }
      });
      container.appendChild(grid);
      return;
    }

    children.forEach((child) => {
      if (child.type !== 'submenu') return;

      const trigger = document.createElement('button');
      trigger.className = 'submenu-trigger';
      trigger.type = 'button';
      trigger.setAttribute('data-target', child.id);
      trigger.setAttribute('aria-expanded', 'false');
      trigger.innerHTML = `<span>${escapeHtml(child.label || '')}</span><span>▾</span>`;
      container.appendChild(trigger);

      const submenu = document.createElement('div');
      submenu.className = 'submenu';
      submenu.id = child.id;
      container.appendChild(submenu);
      renderChildren(child.children || [], submenu);
    });
  };

  const renderCatalog = (catalogData) => {
    if (!catalogRoot) return;

    catalogRoot.innerHTML = '';
    const fragment = document.createDocumentFragment();

    catalogData.families.forEach((family) => {
      const section = document.createElement('section');
      section.className = ['family-card', family.className || ''].filter(Boolean).join(' ');
      section.setAttribute('aria-labelledby', `${family.id}-title`);

      section.innerHTML = `
        <button class="family-trigger" type="button" data-target="${family.id}-panel" aria-expanded="false">
          <div class="family-copy">
            <h2 id="${family.id}-title">${escapeHtml(family.title || '')}</h2>
            <p>${escapeHtml(family.description || '')}</p>
          </div>
          <span class="caret">▾</span>
        </button>
        <div class="family-panel" id="${family.id}-panel"></div>
      `;

      const panel = section.querySelector('.family-panel');
      const panelContent = document.createElement(family.children?.some((child) => child.type === 'submenu') ? 'div' : 'div');
      panelContent.className = family.children?.some((child) => child.type === 'submenu') ? 'links' : 'variant-grid';
      renderChildren(family.children || [], panelContent);
      panel.appendChild(panelContent);
      fragment.appendChild(section);
    });

    catalogRoot.appendChild(fragment);
  };

  const buildLockInfo = (item) => {
    const title = (item?.title || '').trim();
    const family = (item?.family || 'Yale').toUpperCase();
    const modelLabel = title || 'LOCK';
    const model = modelLabel.replace(/[^A-Z0-9]/g, '') || 'LOCK';
    const familyKey = family.includes('ASSURE') ? 'ASSURE' : family.includes('COLLAB') ? 'COLLABS' : family.includes('REAL') ? 'REAL LIVING' : family.includes('YALE') ? 'YALE CODE' : 'YALE';
    const isAssure2 = family.includes('ASSURE 2');
    const isYrdAssure1 = family.includes('ASSURE 1') && /^YRD/i.test(modelLabel);
    const isAndersenVariant = /ANDERSEN/i.test(family) || /YRM2X7|YRM/i.test(modelLabel);
    const isAllowedReplacementFamily = isAssure2 || isYrdAssure1 || isAndersenVariant;

    const supportSummary = item?.support?.summary || `${modelLabel} - Diagnóstico específico`;
    const supportBody = item?.support?.body || `${familyKey}: revisa el estado de la batería, el alcance Bluetooth y la app para ${modelLabel} antes de cambiar repuestos.`;
    const emtekMessage = [{ title: 'NO REPLACEMENTS', items: [{ name: 'No reemplazamos partes', value: 'Nosotros no reemplazamos partes en este modelo' }] }];
    const placeholderReplacement = [{ title: 'Próximamente', items: [{ name: 'Próximamente', value: 'Próximamente' }] }];

    const replacementItems = isEmtekVariant
      ? emtekMessage
      : isAllowedReplacementFamily
        ? (Array.isArray(item?.replacementGroups) && item.replacementGroups.length
          ? item.replacementGroups
          : placeholderReplacement)
        : placeholderReplacement;

    const troubleshootingItems = [
      { summary: supportSummary, body: supportBody },
      {
        summary: `${modelLabel} - Dispositivos no disponibles`,
        body: `Verifica que el bluetooth esté activo, que el lock esté dentro del rango y que la batería esté cargada para ${modelLabel}.`
      },
      {
        summary: `${modelLabel} - Reset físico`,
        body: `Si no responde, repite el reset físico del lock y confirma el estado de la batería antes de reemplazarlo.`
      }
    ];

    return { troubleshootingItems, replacementItems };
  };

  const bindInteractions = () => {
    const familyTriggers = document.querySelectorAll('.family-trigger');
    const submenuTriggers = document.querySelectorAll('.submenu-trigger');

    familyTriggers.forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        const panel = document.getElementById(targetId);
        if (!panel) return;

        const isOpen = panel.classList.contains('open');
        document.querySelectorAll('.family-panel.open').forEach((openPanel) => {
          if (openPanel !== panel) {
            openPanel.classList.remove('open');
            const siblingTrigger = document.querySelector(`[data-target="${openPanel.id}"]`);
            if (siblingTrigger) {
              siblingTrigger.setAttribute('aria-expanded', 'false');
            }
          }
        });

        panel.classList.toggle('open', !isOpen);
        button.setAttribute('aria-expanded', String(!isOpen));
      });
    });

    submenuTriggers.forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        const submenu = document.getElementById(targetId);
        if (!submenu) return;

        const isOpen = submenu.classList.contains('open');
        const parent = submenu.parentElement;
        if (parent) {
          parent.querySelectorAll(':scope > .submenu.open').forEach((openSubmenu) => {
            if (openSubmenu !== submenu) {
              openSubmenu.classList.remove('open');
              const siblingTrigger = document.querySelector(`[data-target="${openSubmenu.id}"]`);
              if (siblingTrigger) {
                siblingTrigger.setAttribute('aria-expanded', 'false');
              }
            }
          });
        }

        submenu.classList.toggle('open', !isOpen);
        button.setAttribute('aria-expanded', String(!isOpen));
      });
    });

    const firstPanel = document.querySelector('.family-panel');
    if (firstPanel) {
      firstPanel.classList.add('open');
      const firstTrigger = document.querySelector(`[data-target="${firstPanel.id}"]`);
      if (firstTrigger) {
        firstTrigger.setAttribute('aria-expanded', 'true');
      }
    }
  };

  const setupGallery = () => {
    const galleryModal = document.getElementById('galleryModal');
    const galleryModalImg = document.getElementById('galleryModalImg');
    const galleryModalTitle = document.getElementById('galleryModalTitle');
    const closeGalleryBtn = document.getElementById('closeGalleryBtn');
    const prevGalleryBtn = document.getElementById('prevGalleryBtn');
    const nextGalleryBtn = document.getElementById('nextGalleryBtn');
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('imagePreviewImg');
    const troubleshootingList = document.getElementById('troubleshootingList');
    const replacementGroup = document.getElementById('replacementGroup');

    const renderLockInfo = (item) => {
      const info = buildLockInfo(item);

      if (troubleshootingList) {
        troubleshootingList.innerHTML = info.troubleshootingItems.map((itemInfo) => `
          <details class="troubleshooting-card">
            <summary>${escapeHtml(itemInfo.summary)}</summary>
            <div class="troubleshooting-card-body">
              <p>${escapeHtml(itemInfo.body)}</p>
            </div>
          </details>
        `).join('');
      }

      if (replacementGroup) {
        replacementGroup.innerHTML = info.replacementItems.map((group) => `
          <div class="replacement-group">
            <h4>${escapeHtml(group.title)}</h4>
            ${group.items.map((entry) => `
              <button
                type="button"
                class="replacement-item copyable-replacement"
                data-copy-value="${escapeHtml(entry.value || '')}"
                aria-label="Copy replacement part number ${escapeHtml(entry.value || '')}"
              >
                <strong>${escapeHtml(entry.name)}</strong>
                <span class="replacement-value">${escapeHtml(entry.value)}</span>
                <span class="copy-tooltip">Copy</span>
              </button>
            `).join('')}
          </div>
        `).join('');

        replacementGroup.querySelectorAll('.copyable-replacement').forEach((button) => {
          const tooltip = button.querySelector('.copy-tooltip');
          const value = button.dataset.copyValue || button.querySelector('.replacement-value')?.textContent?.trim() || '';

          button.addEventListener('click', async () => {
            if (!value) return;

            try {
              await copyTextToClipboard(value);
              if (tooltip) {
                tooltip.textContent = 'Copied!';
              }
              button.classList.add('copied');
              window.clearTimeout(button._copyResetTimer);
              button._copyResetTimer = window.setTimeout(() => {
                if (tooltip) {
                  tooltip.textContent = 'Copy';
                }
                button.classList.remove('copied');
              }, 1200);
            } catch (error) {
              if (tooltip) {
                tooltip.textContent = 'Failed';
              }
              window.clearTimeout(button._copyResetTimer);
              button._copyResetTimer = window.setTimeout(() => {
                if (tooltip) {
                  tooltip.textContent = 'Copy';
                }
              }, 1200);
            }
          });
        });
      }
    };

    const galleryCards = Array.from(document.querySelectorAll('.placeholder-image'));
    const galleryItems = galleryCards.map((thumb) => {
      const img = thumb.querySelector('img');
      const card = thumb.closest('.variant-card');
      const family = card?.closest('.family-card')?.querySelector('h2')?.textContent.trim() || '';
      return {
        src: img?.src || '',
        title: img?.alt || '',
        lockId: card?.id || '',
        family,
        support: card ? JSON.parse(card.dataset.support || '{}') : {},
        replacementGroups: card ? JSON.parse(card.dataset.replacements || '[]') : []
      };
    });

    let currentGalleryIndex = 0;

    const updateGalleryModal = (index) => {
      const item = galleryItems[index];
      if (!item || !galleryModalImg) return;
      galleryModalImg.src = item.src;
      galleryModalImg.alt = item.title;
      if (galleryModalTitle) {
        galleryModalTitle.textContent = item.title;
        galleryModalTitle.href = item.lockId ? `#${encodeURIComponent(item.lockId)}` : '#';
        galleryModalTitle.setAttribute('aria-label', `Ir al lock ${item.title}`);
      }
      renderLockInfo(item);
      currentGalleryIndex = index;
    };

    const openGallery = (index) => {
      if (!galleryModal || !galleryItems.length) return;
      updateGalleryModal((index + galleryItems.length) % galleryItems.length);
      galleryModal.classList.add('show');
      galleryModal.setAttribute('aria-hidden', 'false');
    };

    const changeGalleryItem = (direction) => {
      if (!galleryModal || !galleryItems.length) return;
      updateGalleryModal((currentGalleryIndex + direction + galleryItems.length) % galleryItems.length);
    };

    galleryCards.forEach((thumb, index) => {
      const img = thumb.querySelector('img');
      if (!img) return;

      if (preview && previewImg) {
        thumb.addEventListener('mouseenter', () => {
          previewImg.src = img.src;
          previewImg.alt = img.alt;
          preview.classList.add('show');
          preview.setAttribute('aria-hidden', 'false');
        });
      }

      thumb.addEventListener('mousemove', (event) => {
        if (preview) {
          preview.style.left = `${event.clientX}px`;
          preview.style.top = `${event.clientY}px`;
        }
      });

      thumb.addEventListener('mouseleave', () => {
        if (preview) {
          preview.classList.remove('show');
          preview.setAttribute('aria-hidden', 'true');
        }
      });

      thumb.addEventListener('click', () => openGallery(index));
    });

    const closeGallery = () => {
      if (!galleryModal) return;
      galleryModal.classList.remove('show');
      galleryModal.setAttribute('aria-hidden', 'true');
    };

    if (galleryModalTitle) {
      galleryModalTitle.addEventListener('click', (event) => {
        event.preventDefault();
        closeGallery();
        const targetHash = galleryModalTitle.getAttribute('href');
        if (!targetHash || targetHash === '#') return;

        if (window.location.hash === targetHash) {
          openHashLock();
          return;
        }

        window.location.hash = targetHash.slice(1);
      });
    }

    if (closeGalleryBtn) {
      closeGalleryBtn.addEventListener('click', closeGallery);
    }

    if (galleryModal) {
      galleryModal.addEventListener('click', (event) => {
        if (event.target === galleryModal) {
          closeGallery();
        }
      });
    }

    if (prevGalleryBtn) {
      prevGalleryBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        changeGalleryItem(-1);
      });
    }

    if (nextGalleryBtn) {
      nextGalleryBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        changeGalleryItem(1);
      });
    }
  };

  const buildCatalogIndex = (catalogData) => {
    const catalog = [];

    const walk = (children, pathSegments) => {
      children.forEach((child) => {
        if (child.type === 'submenu') {
          walk(child.children || [], [...pathSegments, child.label]);
        } else if (child.type === 'variant') {
          catalog.push({
            model: child.model,
            description: child.description,
            path: ['Yale', ...pathSegments, child.model].filter(Boolean).join('/'),
            href: `YLManuals.html#lock-${encodeURIComponent(child.model)}`
          });
        }
      });
    };

    catalogData.families.forEach((family) => {
      walk(family.children || [], [family.title]);
    });

    return catalog;
  };

  const setupSearch = (catalogData) => {
    const lockSearch = document.getElementById('lockSearch');
    const searchResults = document.getElementById('searchResults');

    if (!lockSearch || !searchResults) return;

    const catalog = buildCatalogIndex(catalogData);
    const renderSearchResults = () => {
      const query = lockSearch.value.trim().toLowerCase();
      searchResults.replaceChildren();
      if (!query) return;

      const matches = catalog.filter((lock) => (
        `${lock.model} ${lock.description} ${lock.path}`.toLowerCase().includes(query)
      ));

      if (!matches.length) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'search-empty';
        emptyMessage.textContent = 'No se encontraron cerraduras con esa búsqueda.';
        searchResults.append(emptyMessage);
        return;
      }

      matches.forEach((lock) => {
        const result = document.createElement('a');
        result.className = 'search-result';
        result.href = lock.href;

        const path = document.createElement('span');
        path.className = 'result-path';
        path.textContent = lock.path;

        const model = document.createElement('span');
        model.className = 'result-model';
        model.textContent = lock.model;

        const action = document.createElement('span');
        action.className = 'result-action';
        action.textContent = 'Abrir ↗';

        result.append(path, model, action);
        searchResults.append(result);
      });
    };

    lockSearch.addEventListener('input', renderSearchResults);
  };

  const openHashLock = () => {
    const lockId = decodeURIComponent(window.location.hash.slice(1));
    if (!lockId.startsWith('lock-')) return;

    const modelCard = document.getElementById(lockId);
    if (!modelCard) return;

    modelCard.closest('.family-panel')?.classList.add('open');
    let submenu = modelCard.closest('.submenu');
    while (submenu) {
      submenu.classList.add('open');
      const trigger = document.querySelector(`[data-target="${submenu.id}"]`);
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
      submenu = submenu.parentElement?.closest('.submenu');
    }

    const familyPanel = modelCard.closest('.family-panel');
    if (familyPanel) {
      const familyTrigger = document.querySelector(`[data-target="${familyPanel.id}"]`);
      if (familyTrigger) familyTrigger.setAttribute('aria-expanded', 'true');
    }

    modelCard.classList.remove('lock-highlight');
    void modelCard.offsetWidth;
    modelCard.classList.add('lock-highlight');
    window.setTimeout(() => modelCard.classList.remove('lock-highlight'), 4200);
    modelCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  try {
    const response = await fetch('./catalog-data.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo cargar el catálogo Yale.');
    const catalogData = await response.json();

    renderCatalog(catalogData);
    bindInteractions();
    setupGallery();
    setupSearch(catalogData);
    openHashLock();
    window.addEventListener('hashchange', openHashLock);
  } catch (error) {
    if (catalogRoot) {
      catalogRoot.innerHTML = '<p class="search-empty">No se pudo cargar el catálogo de cerraduras.</p>';
    }
  }
});
