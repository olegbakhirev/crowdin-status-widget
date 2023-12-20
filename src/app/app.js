import 'babel-polyfill';
import DashboardAddons from 'hub-dashboard-addons';
import {i18n} from 'hub-dashboard-addons/dist/localization';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Panel from '@jetbrains/ring-ui/components/panel/panel';
import Button from '@jetbrains/ring-ui/components/button/button';
import Input, {
  Size as InputSize
} from '@jetbrains/ring-ui/components/input/input';
import Link from '@jetbrains/ring-ui/components/link/link';
import EmptyWidget, {EmptyWidgetFaces} from '@jetbrains/hub-widget-ui/dist/empty-widget';
import Loader from '@jetbrains/ring-ui/components/loader/loader';

import '@jetbrains/ring-ui/components/form/form.scss';
import {initTranslations} from './translations';
import styles from './app.css';

const flaggedLanguages = ['French', 'German', 'Japanese', 'Russian', 'Spanish', 'Korean', 'Chinese Simplified', 'Portuguese, Brazilian'];

class Widget extends Component {
  static propTypes = {
    dashboardApi: PropTypes.object,
    registerWidgetApi: PropTypes.func
  };

  constructor(props) {
    super(props);
    const {registerWidgetApi} = props;

    this.state = {
      isConfiguring: true,
      dataFetchFailed: false
    };

    registerWidgetApi({
      onConfigure: () => this.setState({isConfiguring: true}),
      onRefresh: () => this.loadCrowdinData()
    });
  }

  componentDidMount() {
    this.initialize(this.props.dashboardApi);
  }

  initialize(dashboardApi) {
    dashboardApi.readConfig().then(config => {
      if (!config) {
        dashboardApi.enterConfigMode();
        this.setState({isConfiguring: true});
      }
      this.setState(
        {
          isConfiguring: false,
          projectId: config.projectId,
          apiKey: config.apiKey
        }
      );
      this.loadCrowdinData();
    });

  }

  saveConfig = async () => {
    const {projectId, apiKey} = this.state;
    await this.props.dashboardApi.storeConfig({projectId, apiKey});
    this.setState({isConfiguring: false});
    this.loadCrowdinData();
  };

  cancelConfig = async () => {
    const {dashboardApi} = this.props;
    const config = await dashboardApi.readConfig();
    if (!config) {
      dashboardApi.removeWidget();
    } else {
      this.setState({isConfiguring: false});
      await dashboardApi.exitConfigMode();
      this.initialize(dashboardApi);
    }
  };

  changeProjectId = e => this.setState({
    projectId: e.target.value
  });

  changeApiKey = e => this.setState({
    apiKey: e.target.value
  });

  renderConfiguration() {
    const {projectId, apiKey} = this.state;

    return (
      <div className={styles.widget}>
        <div className="ring-form__group">
          <Input
            placeholder={i18n('Project id')}
            onChange={this.changeProjectId}
            value={projectId}
            size={InputSize.FULL}
          />
        </div>

        <div className="ring-form__group">
          <Input
            placeholder={i18n('API key')}
            onChange={this.changeApiKey}
            value={apiKey}
            size={InputSize.FULL}
            type="password"
          />
        </div>
        <Panel className={styles.formFooter}>
          <Button
            blue={true}
            disabled={!apiKey || !projectId}
            onClick={this.saveConfig}
          >
            {i18n('Save')}
          </Button>
          <Button onClick={this.cancelConfig}>
            {i18n('Cancel')}
          </Button>
        </Panel>
      </div>
    );
  }

  async loadCrowdinData() {
    const {dashboardApi} = this.props;
    const {projectId, apiKey} = this.state;

    dashboardApi.setTitle(
      projectId
        ? i18n('Project: {{projectId}}', {projectId})
        : i18n('Crowdin Project Status')
    );
    this.setState({data: null, dataFetchFailed: false});
    try {
      const listProjectResp =
        await fetch('https://api.crowdin.com/api/v2/projects', {
          headers: new Headers({Authorization: `Bearer ${apiKey}`})
        });
      const projectsJson = await listProjectResp.json();
      const projectData =
        projectsJson.data.find(
          project => project.data.identifier === projectId);

      const projectProgressResp =
        await fetch(`https://api.crowdin.com/api/v2/projects/${projectData.data.id}/languages/progress`, {
          headers: new Headers({Authorization: `Bearer ${apiKey}`})
        });
      const projectProgressData = await projectProgressResp.json();
      this.setState({data: projectProgressData.data, dataFetchFailed: ''});
    } catch (error) {
      this.setState({data: null, dataFetchFailed: true});
    }
  }

  openCrowdinWindow(crowdinProjectUrl, languageCode) {
    window.open(`${crowdinProjectUrl}${languageCode}`, '_blank');
  }

  editWidgetSettings = () => {
    this.props.dashboardApi.enterConfigMode();
    this.setState({isConfiguring: true});
  };

  handleOnLanguageClick(crowdinProjectUrl, languageCode) {
    return () => this.openCrowdinWindow(crowdinProjectUrl, languageCode);
  }

  render() {
    const {isConfiguring, data, dataFetchFailed} = this.state;

    if (isConfiguring) {
      return this.renderConfiguration();
    }

    if (data) {
      const crowdinProjectUrl = `https://crowdin.com/project/${this.state.projectId}/`;

      const getMissingCountString = missingCount => {
        if (missingCount < 1) {
          return i18n('Done!');
        }
        return missingCount === 1
          ? i18n('Missing 1 word')
          : i18n('Missing {{missingCount}} words',
            {missingCount}, missingCount);
      };


      return (
        <div className={styles.widget}>
          <div className={styles.translationBlockWrapper}>
            {data.map(language => language.data).map(languageData => {
              let flagFilename;
              if (flaggedLanguages.indexOf(languageData.language.name) > -1) {
                flagFilename = `pict/${languageData.language.threeLettersCode}.svg`;
              } else {
                flagFilename = 'pict/default_flag.png';
              }
              const wordsRemaining =
                languageData.words.total - languageData.words.translated;
              const statusStyle = wordsRemaining < 1
                ? styles.absoluteStatusDone
                : styles.absoluteStatusIncomplete;
              return (
                <div
                  key={languageData.language.name}
                  className={styles.languageProgressContainer}
                  onClick={
                    this.handleOnLanguageClick(
                      crowdinProjectUrl, languageData.language.id)
                  }
                >
                  <div className={styles.statusTextContainer}>
                    <div className={styles.languageProgressText}>
                      <img
                        className={'flag'}
                        src={flagFilename}
                      />
                      {`${languageData.language.name} ${languageData.translationProgress}%`}
                    </div>
                    <div className={styles.progressBarContainer}>
                      <div
                        className={styles.progressBar}
                        style={{width: `${languageData.translated_progress}%`}}
                      />
                    </div>
                    <div className={statusStyle}>
                      {getMissingCountString(
                        languageData.words.total -
                        languageData.words.translated)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (dataFetchFailed) {
      return (
        <div className={styles.widget}>
          <EmptyWidget
            face={EmptyWidgetFaces.ERROR}
            message={i18n('Failed fetching data from Crowdin.')}
          >
            <Link
              pseudo={true}
              onClick={this.editWidgetSettings}
            >
              {i18n('Set project and API key')}
            </Link>
          </EmptyWidget>
        </div>
      );
    } else {
      return (
        <div>
          <Loader message={i18n('Loading...')}/>
        </div>
      );
    }
  }
}

DashboardAddons.registerWidget((dashboardApi, registerWidgetApi) => {
  initTranslations(DashboardAddons.locale);

  return render(
    <Widget
      dashboardApi={dashboardApi}
      registerWidgetApi={registerWidgetApi}
    />,
    document.getElementById('app-container')
  );
});
