import 'babel-polyfill';
import DashboardAddons from 'hub-dashboard-addons';
import {setLocale, i18n} from 'hub-dashboard-addons/dist/localization';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Panel from '@jetbrains/ring-ui/components/panel/panel';
import Button from '@jetbrains/ring-ui/components/button/button';
import Input, {Size as InputSize} from '@jetbrains/ring-ui/components/input/input';
import Link from '@jetbrains/ring-ui/components/link/link';
import EmptyWidget, {EmptyWidgetFaces} from '@jetbrains/hub-widget-ui/dist/empty-widget';
import Loader from '@jetbrains/ring-ui/components/loader/loader';
import fetchJsonp from 'fetch-jsonp';
import '@jetbrains/ring-ui/components/form/form.scss';


import 'file-loader?name=[name].[ext]!../../manifest.json'; // eslint-disable-line import/no-unresolved

import TRANSLATIONS from './translations';

import styles from './app.css';

const flaggedLanguages = ['French', 'German', 'Japanese', 'Russian', 'Spanish'];

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
        {isConfiguring: false,
          projectId: config.projectId,
          apiKey: config.apiKey}
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

  loadCrowdinData() {
    const {dashboardApi} = this.props;
    const {projectId, apiKey} = this.state;

    dashboardApi.setTitle(
      projectId
        ? i18n('Project: {{projectId}}', {projectId})
        : i18n('Crowdin Project Status')
    );
    this.setState({data: null, dataFetchFailed: false});
    fetchJsonp(`https://api.crowdin.com/api/project/${projectId}/status?key=${apiKey}`, {
      jsonpCallback: 'jsonp'
    }).then(response => response.json()).then(json => {
      this.setState({data: json, dataFetchFailed: ''});
    }).catch(() => {
      this.setState({data: null, dataFetchFailed: true});
    });
  }

  openCrowdinWindow(crowdinProjectUrl, language) {
    window.open(`${crowdinProjectUrl}${language.code}#`, '_blank');
  }

  editWidgetSettings = () => {
    this.props.dashboardApi.enterConfigMode();
    this.setState({isConfiguring: true});
  };

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
            {data.map(language => {
              let flagFilename;
              if (flaggedLanguages.indexOf(language.name) > -1) {
                flagFilename = `pict/${language.name.toLowerCase()}_flag.png`;
              } else {
                flagFilename = 'pict/default_flag.png';
              }

              const wordsRemaining = language.words - language.words_translated;
              const statusStyle = wordsRemaining < 1
                ? styles.absoluteStatusDone
                : styles.absoluteStatusIncomplete;

              return (
                <div
                  key={language.name}
                  className={styles.languageProgressContainer}
                  onClick={this.openCrowdinWindow(crowdinProjectUrl, language)}
                >
                  <div className={styles.statusTextContainer}>
                    <div className={styles.languageProgressText}>
                      <img
                        className={'flag'}
                        src={flagFilename}
                      />
                      {`${language.name} ${language.translated_progress}%`}
                    </div>
                    <div className={styles.progressBarContainer}>
                      <div className={styles.progressBar} style={{width: `${language.translated_progress}%`}}/>
                    </div>
                    <div className={statusStyle}>
                      {getMissingCountString(
                        language.words - language.words_translated)}
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
  setLocale(DashboardAddons.locale, TRANSLATIONS);

  return render(
    <Widget
      dashboardApi={dashboardApi}
      registerWidgetApi={registerWidgetApi}
    />,
    document.getElementById('app-container')
  );
});
